import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  ExamServiceError,
  finishExam,
  getAttemptForUser,
  getResult,
  saveProgress,
  startExam,
  startRecoveryExam,
} from "../src/lib/exam-service";
import { computeStemHash } from "../src/lib/gemini";
import { DONT_KNOW_OPTION_ID } from "../src/types/exam";

const tag = `svc${Date.now()}`;
const TEST_TOPIC = "AWS Shield e Proteção DDoS";
let userA: string;
let userB: string;

async function expectServiceError(promise: Promise<unknown>, status: number) {
  await expect(promise).rejects.toBeInstanceOf(ExamServiceError);
  await promise.catch((e: ExamServiceError) => expect(e.status).toBe(status));
}

async function wrongOptionFor(attemptId: string, questionId: string) {
  const row = await prisma.examAnswer.findFirstOrThrow({
    where: { attemptId, questionId },
    include: { question: true },
  });
  return ["opt_a", "opt_b", "opt_c", "opt_d"].find((o) => o !== row.question.correctOptionId)!;
}

beforeAll(async () => {
  delete process.env.GEMINI_API_KEY;
  userA = (await prisma.user.create({ data: { name: "A", email: `a.${tag}@teste.local` } })).id;
  userB = (await prisma.user.create({ data: { name: "B", email: `b.${tag}@teste.local` } })).id;
  // 30 questões extras de um único tópico para testar a recuperação de forma determinística
  await prisma.question.createMany({
    data: Array.from({ length: 30 }, (_, i) => {
      const stem = `[${tag}] Cenário ${i} de proteção contra ataques volumétricos na camada de rede ${i * 7919}`;
      return {
        id: `${tag}_${i}`,
        domain: "Domínio 2: Segurança e Conformidade",
        topic: TEST_TOPIC,
        stem,
        optionA: "AWS Shield Advanced.",
        optionB: "AWS Config Rules.",
        optionC: "Amazon Inspector.",
        optionD: "AWS Artifact.",
        correctOptionId: "opt_a",
        explanation: "Explicação de teste suficientemente longa para validação.",
        stemHash: computeStemHash(stem),
        source: "TESTE",
      };
    }),
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.question.deleteMany({ where: { id: { startsWith: tag } } });
  await prisma.$disconnect();
});

describe("Serviço de simulados: proteção do gabarito e modos", () => {
  it("o início não envia gabarito, explicação nem tópico e não repete questões", async () => {
    const started = await startExam(userA, { questionCount: 30, mode: "PROVA" });
    const json = JSON.stringify(started);
    expect(json).not.toMatch(/correctOptionId|explanation|"topic"|documentationUrl/);
    expect(started.questions).toHaveLength(30);
    expect(new Set(started.questions.map((q) => q.id)).size).toBe(30);
    expect(new Set(started.questions.map((q) => computeStemHash(q.stem))).size).toBe(30);
    started.questions.forEach((q) => {
      expect(q.options).toHaveLength(5);
      expect(q.options[4].id).toBe(DONT_KNOW_OPTION_ID);
    });
  });

  it("embaralha as alternativas para que a posição não indique a resposta", async () => {
    const started = await startExam(userB, { questionCount: 45, mode: "PROVA" });
    let correctFirst = 0;
    for (const q of started.questions) {
      const row = await prisma.question.findUniqueOrThrow({ where: { id: q.id } });
      if (q.options[0].id === row.correctOptionId) correctFirst++;
    }
    expect(correctFirst / started.questions.length).toBeLessThan(0.6);
  });

  it("um novo simulado não reutiliza questões já apresentadas enquanto houver inéditas", async () => {
    const seen = new Set(
      (await prisma.examAnswer.findMany({ where: { attempt: { userId: userA } } })).map((a) => a.questionId)
    );
    const second = await startExam(userA, { questionCount: 15, mode: "ESTUDO", selectedTopics: ["TODOS"] });
    second.questions.forEach((q) => expect(seen.has(q.id)).toBe(false));
  });

  it("Modo Prova: resultado sem gabarito e sem explicações, com relatório por domínio e tópico", async () => {
    const started = await startExam(userA, { questionCount: 15, mode: "PROVA" });
    const [q1, q2, q3] = started.questions;
    const result = await finishExam(userA, started.attemptId, {
      [q1.id]: q1.options[0].id,
      [q2.id]: DONT_KNOW_OPTION_ID,
      [q3.id]: await wrongOptionFor(started.attemptId, q3.id),
    });
    expect(result.mode).toBe("PROVA");
    expect(result.detailedAnswers).toBeUndefined();
    expect(JSON.stringify(result)).not.toMatch(/correctOptionId|explanation/);
    expect(result.correctCount + result.incorrectCount + result.dontKnowCount + result.unansweredCount).toBe(15);
    expect(result.dontKnowCount).toBe(1);
    expect(result.unansweredCount).toBe(12);
    expect(result.topicBreakdown.length).toBeGreaterThan(0);
    const again = await getResult(userA, started.attemptId);
    expect(again.detailedAnswers).toBeUndefined();
  });

  it("Modo Estudo: resultado com revisão detalhada e explicação de todas as questões", async () => {
    const started = await startExam(userB, { questionCount: 15, mode: "ESTUDO" });
    const result = await finishExam(userB, started.attemptId, {});
    expect(result.detailedAnswers).toHaveLength(15);
    result.detailedAnswers!.forEach((a) => {
      expect(a.explanation.length).toBeGreaterThan(10);
      expect(a.correctOptionId).toMatch(/^opt_[abcd]$/);
      expect(a.status).toBe("NAO_RESPONDIDA");
    });
  });

  it("resultado só fica disponível após finalizar; finalizar duas vezes é recusado", async () => {
    const started = await startExam(userA, { questionCount: 15, mode: "ESTUDO" });
    await expectServiceError(getResult(userA, started.attemptId), 409);
    await finishExam(userA, started.attemptId, {});
    await expectServiceError(finishExam(userA, started.attemptId, {}), 409);
    await expectServiceError(saveProgress(userA, started.attemptId, {}), 409);
  });

  it("rejeita respostas para questões de fora do simulado e alternativas inválidas", async () => {
    const started = await startExam(userA, { questionCount: 15, mode: "PROVA" });
    await expectServiceError(saveProgress(userA, started.attemptId, { qualquer_id: "opt_a" }), 400);
    await expectServiceError(saveProgress(userA, started.attemptId, { [started.questions[0].id]: "opt_z" }), 400);
    await saveProgress(userA, started.attemptId, { [started.questions[0].id]: "opt_b" });
    const resumed = await getAttemptForUser(userA, started.attemptId);
    expect(resumed.finished).toBe(false);
    if (!resumed.finished) {
      expect(resumed.answers[started.questions[0].id]).toBe("opt_b");
      expect(JSON.stringify(resumed)).not.toMatch(/correctOptionId|explanation|"topic"/);
    }
  });

  it("rejeita quantidades, modos e tópicos inválidos", async () => {
    await expectServiceError(startExam(userA, { questionCount: 20, mode: "PROVA" }), 400);
    await expectServiceError(startExam(userA, { questionCount: 15, mode: "LIVRE" }), 400);
    await expectServiceError(
      startExam(userA, { questionCount: 15, mode: "PROVA", selectedTopics: ["Domínio 1: Conceitos de Nuvem"], selectedSubtopics: ["Tópico inventado"] }),
      400
    );
  });
});

describe("Isolamento entre contas (IDOR)", () => {
  it("usuário B não consegue ler, salvar, finalizar, ver resultado nem gerar recuperação do simulado de A", async () => {
    const started = await startExam(userA, { questionCount: 15, mode: "ESTUDO" });
    const id = started.attemptId;
    await expectServiceError(getAttemptForUser(userB, id), 404);
    await expectServiceError(saveProgress(userB, id, { [started.questions[0].id]: "opt_a" }), 404);
    await expectServiceError(finishExam(userB, id, {}), 404);
    await finishExam(userA, id, {});
    await expectServiceError(getResult(userB, id), 404);
    await expectServiceError(startRecoveryExam(userB, id), 404);
    const attempt = await prisma.examAttempt.findUniqueOrThrow({ where: { id } });
    expect(attempt.userId).toBe(userA);
  });

  it("IDs inexistentes retornam 404", async () => {
    await expectServiceError(getAttemptForUser(userA, "nao-existe"), 404);
  });
});

describe("Simulado de recuperação", () => {
  it("usa somente os tópicos com erro ou 'Não sei' e não reutiliza questões vistas", async () => {
    const user = (await prisma.user.create({ data: { name: "C", email: `c.${tag}@teste.local` } })).id;
    const first = await startExam(user, {
      questionCount: 15,
      mode: "ESTUDO",
      selectedTopics: ["Domínio 2: Segurança e Conformidade"],
      selectedSubtopics: [TEST_TOPIC],
    });
    const answers: Record<string, string> = {};
    for (const q of first.questions) answers[q.id] = DONT_KNOW_OPTION_ID;
    const result = await finishExam(user, first.attemptId, answers);
    expect(result.recoveryTopics).toEqual([TEST_TOPIC]);

    const recovery = await startRecoveryExam(user, first.attemptId);
    expect(recovery.isRecovery).toBe(true);
    expect(recovery.mode).toBe("ESTUDO");
    const firstIds = new Set(first.questions.map((q) => q.id));
    recovery.questions.forEach((q) => expect(firstIds.has(q.id)).toBe(false));
    const topics = await prisma.question.findMany({
      where: { id: { in: recovery.questions.map((q) => q.id) } },
      select: { topic: true },
    });
    topics.forEach((t) => expect(t.topic).toBe(TEST_TOPIC));
    const attempt = await prisma.examAttempt.findUniqueOrThrow({ where: { id: recovery.attemptId } });
    expect(attempt.sourceAttemptId).toBe(first.attemptId);

    // Banco do tópico esgotado: a recuperação recusa em vez de repetir questões
    const all: Record<string, string> = {};
    for (const q of recovery.questions) all[q.id] = DONT_KNOW_OPTION_ID;
    await finishExam(user, recovery.attemptId, all);
    await expectServiceError(startRecoveryExam(user, recovery.attemptId), 409);
  });

  it("recusa recuperação de simulado sem erros ou não finalizado", async () => {
    const started = await startExam(userB, { questionCount: 15, mode: "PROVA" });
    await expectServiceError(startRecoveryExam(userB, started.attemptId), 409);
    await finishExam(userB, started.attemptId, {});
    // somente questões em branco: não há tópicos de erro/Não sei
    await expectServiceError(startRecoveryExam(userB, started.attemptId), 400);
  });
});
