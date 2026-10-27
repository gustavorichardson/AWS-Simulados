// ============================================================================
// SELEÇÃO E GERAÇÃO DE QUESTÕES (SERVIDOR)
// - Nunca repete uma questão dentro do mesmo simulado.
// - Prioriza questões inéditas para o usuário; gera novas quando faltarem.
// - Questões geradas são validadas, deduplicadas e persistidas antes do uso.
// ============================================================================
import { randomInt } from "crypto";
import type { Question } from "@prisma/client";
import { prisma } from "./prisma";
import { MOCK_QUESTIONS } from "../data/mockQuestions";
import { ExamDomain, QuestionInternal } from "../types/exam";
import { DOMAIN_HIERARCHIES } from "../types/subtopics";
import {
  computeStemHash,
  generateQuestionsWithGemini,
  isAiGenerationConfigured,
} from "./gemini";
import { isNearDuplicate } from "./question-quality";

export class InsufficientQuestionsError extends Error {
  constructor(public readonly available: number, public readonly requested: number) {
    super(
      `Não há questões inéditas suficientes para os tópicos escolhidos (${available} de ${requested}). ` +
        "Escolha mais tópicos ou uma quantidade menor de questões."
    );
    this.name = "InsufficientQuestionsError";
  }
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function toInternalQuestion(q: Question): QuestionInternal {
  return {
    id: q.id,
    domain: q.domain as ExamDomain,
    topic: q.topic,
    stem: q.stem,
    options: [
      { id: "opt_a", text: q.optionA },
      { id: "opt_b", text: q.optionB },
      { id: "opt_c", text: q.optionC },
      { id: "opt_d", text: q.optionD },
    ],
    correctOptionId: q.correctOptionId,
    explanation: q.explanation,
    documentationUrl: q.documentationUrl ?? undefined,
  };
}

function toQuestionRow(q: QuestionInternal, source: string) {
  const text = (id: string) => q.options.find((o) => o.id === id)?.text ?? "";
  return {
    id: q.id,
    domain: q.domain,
    topic: q.topic,
    stem: q.stem,
    optionA: text("opt_a"),
    optionB: text("opt_b"),
    optionC: text("opt_c"),
    optionD: text("opt_d"),
    correctOptionId: q.correctOptionId,
    explanation: q.explanation,
    documentationUrl: q.documentationUrl ?? null,
    difficulty: "HARD",
    stemHash: computeStemHash(q.stem),
    source,
  };
}

let bankReady: Promise<void> | null = null;

/** Garante que o banco inicial de questões esteja persistido (idempotente). */
export function ensureQuestionBank(): Promise<void> {
  if (!bankReady) {
    bankReady = prisma.question
      .createMany({
        data: MOCK_QUESTIONS.map((q) => toQuestionRow(q, "BANCO_INICIAL")),
        skipDuplicates: true,
      })
      .then(() => undefined)
      .catch((error) => {
        bankReady = null;
        throw error;
      });
  }
  return bankReady;
}

export interface SelectQuestionsParams {
  userId: string;
  count: number;
  domains: ExamDomain[];
  /** Subtópicos exatos. Vazio = todos os subtópicos dos domínios. */
  subtopics: string[];
  /**
   * Permite reutilizar questões já vistas (as mais antigas primeiro) somente quando o banco
   * inédito daqueles tópicos se esgotar e não for possível gerar novas.
   */
  allowSeenReuse: boolean;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms)),
  ]);
}

async function generateMissingQuestions(
  missing: number,
  domains: ExamDomain[],
  subtopics: string[],
  relatedStems: string[]
): Promise<QuestionInternal[]> {
  const targetSubtopics =
    subtopics.length > 0
      ? subtopics
      : DOMAIN_HIERARCHIES.filter((h) => domains.includes(h.domain)).flatMap((h) => h.subtopics);

  const existingHashes = new Set(
    (await prisma.question.findMany({ select: { stemHash: true } })).map((q) => q.stemHash)
  );
  const acceptedStems = [...relatedStems];
  const accepted: QuestionInternal[] = [];

  for (let round = 0; round < 2 && accepted.length < missing; round++) {
    const remaining = missing - accepted.length;
    const requested = Math.ceil(remaining * 1.4) + 1;
    const batchCount = Math.min(8, Math.ceil(requested / 10));
    const shuffledSubtopics = shuffle(targetSubtopics);

    const batches = Array.from({ length: batchCount }, (_, i) => {
      const own = shuffledSubtopics.filter((_, j) => j % batchCount === i);
      return {
        count: Math.ceil(requested / batchCount),
        subtopics: own.length > 0 ? own : shuffledSubtopics,
      };
    });

    const results = await Promise.allSettled(
      batches.map((b) =>
        withTimeout(
          generateQuestionsWithGemini({
            count: b.count,
            domain: domains.length === 1 ? domains[0] : undefined,
            subtopics: b.subtopics,
            existingHashes,
            existingStems: acceptedStems,
          }),
          90_000
        )
      )
    );

    for (const result of results) {
      if (result.status !== "fulfilled") {
        console.error("[questoes] falha ao gerar lote:", result.reason?.message ?? result.reason);
        continue;
      }
      for (const q of result.value) {
        if (accepted.length >= missing) break;
        const hash = computeStemHash(q.stem);
        if (existingHashes.has(hash) || isNearDuplicate(q.stem, acceptedStems)) continue;
        existingHashes.add(hash);
        acceptedStems.push(q.stem);
        accepted.push(q);
      }
    }
  }

  if (accepted.length === 0) return [];

  await prisma.question.createMany({
    data: accepted.map((q) => toQuestionRow(q, "GERADA")),
    skipDuplicates: true,
  });

  const persisted = await prisma.question.findMany({
    where: { stemHash: { in: accepted.map((q) => computeStemHash(q.stem)) } },
  });
  return persisted.map(toInternalQuestion);
}

/**
 * Seleciona `count` questões distintas para o usuário, sem repetir questões já apresentadas
 * a ele enquanto houver alternativas inéditas (do banco ou geradas).
 */
export async function selectQuestionsForUser(
  params: SelectQuestionsParams
): Promise<QuestionInternal[]> {
  await ensureQuestionBank();

  const pool = await prisma.question.findMany({
    where: {
      isActive: true,
      domain: { in: params.domains },
      ...(params.subtopics.length > 0 ? { topic: { in: params.subtopics } } : {}),
    },
  });

  const seenRows = await prisma.examAnswer.findMany({
    where: { attempt: { userId: params.userId } },
    select: { questionId: true, attempt: { select: { startedAt: true } } },
  });
  const lastSeen = new Map<string, number>();
  for (const row of seenRows) {
    const time = row.attempt.startedAt.getTime();
    lastSeen.set(row.questionId, Math.max(lastSeen.get(row.questionId) ?? 0, time));
  }

  const picked: QuestionInternal[] = [];
  const pickedHashes = new Set<string>();
  const add = (q: QuestionInternal) => {
    const hash = computeStemHash(q.stem);
    if (picked.length >= params.count || pickedHashes.has(hash)) return;
    pickedHashes.add(hash);
    picked.push(q);
  };

  shuffle(pool.filter((q) => !lastSeen.has(q.id))).forEach((q) => add(toInternalQuestion(q)));

  if (picked.length < params.count && isAiGenerationConfigured()) {
    try {
      const generated = await generateMissingQuestions(
        params.count - picked.length,
        params.domains,
        params.subtopics,
        pool.map((q) => q.stem)
      );
      generated.forEach(add);
    } catch (error) {
      console.error("[questoes] geração indisponível:", (error as Error).message);
    }
  }

  if (picked.length < params.count && params.allowSeenReuse) {
    pool
      .filter((q) => lastSeen.has(q.id))
      .sort((a, b) => lastSeen.get(a.id)! - lastSeen.get(b.id)!)
      .forEach((q) => add(toInternalQuestion(q)));
  }

  if (picked.length < params.count) {
    throw new InsufficientQuestionsError(picked.length, params.count);
  }

  return shuffle(picked);
}
