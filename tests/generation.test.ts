import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { QuestionDifficulty, QuestionInternal } from "../src/types/exam";

const tag = `gen${Date.now()}`;
const TOPIC = "AWS Secrets Manager";

vi.mock("../src/lib/gemini", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/lib/gemini")>();
  return {
    ...original,
    isAiGenerationConfigured: () => true,
    generateQuestionsWithGemini: vi.fn(async (options: {
      difficulty: QuestionDifficulty;
      subtopics?: string[];
    }): Promise<QuestionInternal[]> => {
      const make = (i: number, stem: string): QuestionInternal => {
        const topic = options.subtopics?.[i % (options.subtopics.length || 1)] ?? TOPIC;
        return {
          id: `gen_${tag}_${i}`,
          domain: findDomainBySubtopic(topic) ?? "Domínio 2: Segurança e Conformidade",
          topic,
          stem,
          options: [
            { id: "opt_a", text: "Opção alfa plausível." },
            { id: "opt_b", text: "Opção beta plausível." },
            { id: "opt_c", text: "Opção gama plausível." },
            { id: "opt_d", text: "Opção delta plausível." },
          ],
          correctOptionId: "opt_c",
          explanation: "Explicação de teste suficientemente longa.",
          difficulty: options.difficulty,
          optionExplanations: {
            opt_a: "A alternativa A não atende ao requisito deste cenário.",
            opt_b: "A alternativa B não atende ao requisito deste cenário.",
            opt_c: "A alternativa C atende ao requisito deste cenário.",
            opt_d: "A alternativa D não atende ao requisito deste cenário.",
          },
        };
      };
      const words = ["varejo", "hospital", "banco", "escola", "logística", "mídia", "governo", "jogos", "energia", "seguros",
        "turismo", "agro", "fintech", "telecom", "farmácia", "indústria", "imobiliária", "esportes", "música", "transporte"];
      const verbs = ["armazenar", "rotacionar", "auditar", "compartilhar", "revogar", "proteger", "versionar", "replicar", "monitorar", "criptografar",
        "distribuir", "isolar", "centralizar", "expirar", "recuperar", "migrar", "catalogar", "validar", "agendar", "limitar"];
      const unique = Array.from({ length: 20 }, (_, i) =>
        make(i, `[${tag}] Empresa de ${words[i]} quer ${verbs[i]} segredos ${i}`)
      );
      // duplicata exata dentro do lote
      return [...unique, make(99, unique[0].stem)];
    }),
  };
});

vi.mock("../src/lib/feedback-triage", () => ({
  triagePendingFeedback: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../src/lib/prisma";
import {
  ensureQuestionBank,
  getComplementarySubtopics,
  InsufficientQuestionsError,
  selectQuestionsForUser,
} from "../src/lib/question-generator";
import { computeStemHash } from "../src/lib/gemini";
import { DOMAIN_HIERARCHIES, findDomainBySubtopic } from "../src/types/subtopics";

let userId: string;

beforeAll(async () => {
  userId = (await prisma.user.create({ data: { name: "G", email: `g.${tag}@teste.local` } })).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.question.deleteMany({ where: { stem: { contains: tag } } });
  await prisma.$disconnect();
});

describe("Geração de questões quando o banco não tem inéditas suficientes", () => {
  it("completa a distribuição 50/50 com questões novas e persistidas", async () => {
    const feedbackQuestion = await prisma.question.create({
      data: {
        id: `gen_feedback_${tag}`,
        domain: "Domínio 2: Segurança e Conformidade",
        topic: TOPIC,
        stem: `[${tag}] Questão anterior registrada para auditoria do feedback no tópico.`,
        optionA: "AWS Secrets Manager.",
        optionB: "AWS KMS.",
        optionC: "AWS IAM.",
        optionD: "AWS CloudTrail.",
        correctOptionId: "opt_a",
        explanation: "Questão auxiliar usada para associar feedback à geração.",
        difficulty: "EASY",
        stemHash: computeStemHash(`[${tag}] Questão anterior registrada para auditoria do feedback no tópico.`),
        source: "TESTE",
      },
    });
    const sourceAttempt = await prisma.examAttempt.create({
      data: {
        userId,
        questionCount: 15,
        difficulty: "EASY",
        selectedDomains: ["Domínio 2: Segurança e Conformidade"],
        selectedSubtopics: [TOPIC],
        mode: "ESTUDO",
      },
    });
    const feedback = await prisma.questionFeedback.create({
      data: {
        userId,
        attemptId: sourceAttempt.id,
        questionId: feedbackQuestion.id,
        category: "REPETIDA",
        triageStatus: "APPROVED",
        difficulty: "EASY",
        domain: "Domínio 2: Segurança e Conformidade",
        topic: TOPIC,
      },
    });
    await ensureQuestionBank();
    const alreadyAvailableQuestions = await prisma.question.findMany({
      where: {
        domain: "Domínio 2: Segurança e Conformidade",
        difficulty: "EASY",
        topic: { in: [TOPIC, ...getComplementarySubtopics([TOPIC])] },
        id: { not: feedbackQuestion.id },
      },
      select: { id: true },
    });
    await prisma.examAnswer.createMany({
      data: alreadyAvailableQuestions.map((question, position) => ({
        attemptId: sourceAttempt.id,
        questionId: question.id,
        position,
      })),
    });

    const questions = await selectQuestionsForUser({
      userId,
      count: 15,
      difficulty: "EASY",
      domains: ["Domínio 2: Segurança e Conformidade"],
      subtopics: [TOPIC],
      allowSeenReuse: false,
    });
    expect(questions).toHaveLength(15);
    expect(new Set(questions.map((q) => q.id)).size).toBe(15);
    expect(new Set(questions.map((q) => computeStemHash(q.stem))).size).toBe(15);
    const selectedTopics = questions.filter((question) => question.topic === TOPIC);
    const complementaryTopics = questions.filter((question) => question.topic !== TOPIC);
    expect(selectedTopics).toHaveLength(8);
    expect(complementaryTopics).toHaveLength(7);
    complementaryTopics.forEach((question) =>
      expect(question.domain).toBe("Domínio 2: Segurança e Conformidade")
    );
    questions.forEach((q) => expect(q.difficulty).toBe("EASY"));
    const persisted = await prisma.question.findMany({
      where: { id: { in: questions.map((q) => q.id) } },
      select: { id: true, difficulty: true, correctOptionId: true, source: true, stem: true },
    });
    expect(persisted).toHaveLength(15);
    persisted.forEach((question) => expect(question.difficulty).toBe("EASY"));
    const generatedCorrectIds = persisted
      .filter((question) => question.source === "GERADA" && question.stem.includes(tag))
      .map((question) => question.correctOptionId);
    expect(generatedCorrectIds).toHaveLength(14);
    const generatedQuestions = questions.filter((question) => question.id.startsWith(`gen_${tag}_`));
    expect(generatedQuestions).toHaveLength(14);
    generatedQuestions.forEach((question) => {
      expect(question.options).toHaveLength(4);
      const correctOption = question.options.find(
        (option) => option.id === question.correctOptionId
      );
      const correctExplanation = Object.entries(question.optionExplanations ?? {}).find(
        ([optionId]) => optionId === question.correctOptionId
      )?.[1];
      expect(correctOption?.text).toBe("Opção gama plausível.");
      expect(correctExplanation).toBe("A alternativa C atende ao requisito deste cenário.");
    });
    const answerPositionCounts = ["opt_a", "opt_b", "opt_c", "opt_d"].map(
      (optionId) => generatedCorrectIds.filter((id) => id === optionId).length
    );
    expect(Math.max(...answerPositionCounts) - Math.min(...answerPositionCounts)).toBeLessThanOrEqual(1);
    const promptUses = await prisma.feedbackPromptUse.findMany({ where: { feedbackId: feedback.id } });
    expect(promptUses.length).toBeGreaterThan(0);
    expect(promptUses.every((use) => use.generatedAt !== null)).toBe(true);
    expect(promptUses.every((use) => use.generatedQuestionIds.length > 0)).toBe(true);
  });

  it("não apresenta uma distribuição válida quando todos os subtópicos do domínio foram selecionados", async () => {
    const securityTopics = DOMAIN_HIERARCHIES.find(
      (hierarchy) => hierarchy.domain === "Domínio 2: Segurança e Conformidade"
    )!.subtopics;

    await expect(
      selectQuestionsForUser({
        userId,
        count: 15,
        difficulty: "EASY",
        domains: ["Domínio 2: Segurança e Conformidade"],
        subtopics: securityTopics,
        allowSeenReuse: false,
      })
    ).rejects.toBeInstanceOf(InsufficientQuestionsError);
  });
});
