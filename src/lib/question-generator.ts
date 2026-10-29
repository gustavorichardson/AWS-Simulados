// ============================================================================
// SELEÇÃO E GERAÇÃO DE QUESTÕES (SERVIDOR)
// - Nunca repete uma questão dentro do mesmo simulado.
// - Prioriza questões inéditas para o usuário; gera novas quando faltarem.
// - Questões geradas são validadas, deduplicadas e persistidas antes do uso.
// ============================================================================
import { randomInt, randomUUID } from "crypto";
import type { Question } from "@prisma/client";
import { prisma } from "./prisma";
import { MOCK_QUESTIONS } from "../data/mockQuestions";
import {
  ExamDomain,
  QUESTION_DIFFICULTIES,
  QuestionDifficulty,
  QuestionInternal,
} from "../types/exam";
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
  const explanations = q.optionExplanations;
  const optionExplanations =
    explanations &&
    typeof explanations === "object" &&
    !Array.isArray(explanations) &&
    typeof explanations.opt_a === "string" &&
    typeof explanations.opt_b === "string" &&
    typeof explanations.opt_c === "string" &&
    typeof explanations.opt_d === "string"
      ? {
          opt_a: explanations.opt_a,
          opt_b: explanations.opt_b,
          opt_c: explanations.opt_c,
          opt_d: explanations.opt_d,
        }
      : undefined;

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
    difficulty: QUESTION_DIFFICULTIES.find((level) => level === q.difficulty) ?? "MEDIUM",
    ...(optionExplanations ? { optionExplanations } : {}),
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
    ...(q.optionExplanations ? { optionExplanations: q.optionExplanations } : {}),
    documentationUrl: q.documentationUrl ?? null,
    difficulty: q.difficulty ?? "MEDIUM",
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
  difficulty: QuestionDifficulty;
  domains: ExamDomain[];
  /** Subtópicos exatos. Vazio = todos os subtópicos dos domínios. */
  subtopics: string[];
  /** Subtópicos fracos que devem receber ao menos 40% da recuperação. */
  focusSubtopics?: string[];
  /**
   * Permite reutilizar questões já vistas (as mais antigas primeiro) somente quando o banco
   * inédito daqueles tópicos se esgotar e não for possível gerar novas.
   */
  allowSeenReuse: boolean;
}

export function getRecoveryDistribution(count: number) {
  const direct = Math.ceil(count * 0.4);
  return { direct, broader: count - direct };
}

function balanceCorrectOptionPosition(
  question: QuestionInternal,
  position: number
): QuestionInternal {
  const optionIds = ["opt_a", "opt_b", "opt_c", "opt_d"] as const;
  const correct = question.options.find((option) => option.id === question.correctOptionId);
  if (!correct) return question;
  const distractors = shuffle(question.options.filter((option) => option.id !== correct.id));
  const ordered = [...distractors];
  ordered.splice(position, 0, correct);
  const idMap = new Map<string, string>();
  const options = ordered.map((option, index) => {
    const newId = optionIds[index];
    idMap.set(option.id, newId);
    return { ...option, id: newId };
  });
  const optionExplanations = question.optionExplanations
    ? Object.fromEntries(
        Object.entries(question.optionExplanations).map(([id, explanation]) => [
          idMap.get(id) ?? id,
          explanation,
        ])
      ) as QuestionInternal["optionExplanations"]
    : undefined;
  return {
    ...question,
    options,
    correctOptionId: idMap.get(correct.id) ?? question.correctOptionId,
    ...(optionExplanations ? { optionExplanations } : {}),
  };
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
  difficulty: QuestionDifficulty,
  subtopics: string[],
  relatedStems: string[],
  feedbackSignals: Array<{
    id: string;
    category: "ERRADA" | "REPETIDA" | "DIFICULDADE_INCORRETA";
    difficulty: QuestionDifficulty;
    direction?: "MAIS_FACIL" | "MAIS_DIFICIL";
    topic: string;
  }> = [],
  relatedSubtopics: string[] = []
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
  const generationIds: string[] = [];

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
      batches.map(async (b) => {
        const generationId = randomUUID();
        generationIds.push(generationId);
        if (feedbackSignals.length > 0) {
          await prisma.feedbackPromptUse.createMany({
            data: feedbackSignals.map((feedback) => ({
              feedbackId: feedback.id,
              generationId,
            })),
            skipDuplicates: true,
          });
          await prisma.questionFeedback.updateMany({
            where: { id: { in: feedbackSignals.map((feedback) => feedback.id) }, usedAt: null },
            data: { usedAt: new Date() },
          });
        }
        return {
          generationId,
          questions: await withTimeout(
            generateQuestionsWithGemini({
              count: b.count,
              difficulty,
              domain: domains.length === 1 ? domains[0] : undefined,
              subtopics: b.subtopics,
              relatedSubtopics,
              existingHashes,
              existingStems: acceptedStems,
              feedbackSignals,
            }),
            90_000
          ),
        };
      })
    );

    for (const result of results) {
      if (result.status !== "fulfilled") {
        console.error("[questoes] falha ao gerar lote:", result.reason?.message ?? result.reason);
        continue;
      }
      for (const q of result.value.questions) {
        if (accepted.length >= missing) break;
        const hash = computeStemHash(q.stem);
        if (existingHashes.has(hash) || isNearDuplicate(q.stem, acceptedStems)) continue;
        existingHashes.add(hash);
        acceptedStems.push(q.stem);
        accepted.push(balanceCorrectOptionPosition(q, accepted.length % 4));
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
  if (feedbackSignals.length > 0 && persisted.length > 0) {
    const now = new Date();
    await prisma.feedbackPromptUse.updateMany({
      where: {
        generationId: { in: generationIds },
        feedbackId: { in: feedbackSignals.map((feedback) => feedback.id) },
      },
      data: {
        generatedQuestionIds: persisted.map((question) => question.id),
        implementedAt: now,
      },
    });
  }
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

  const focusSubtopics = [...new Set(params.focusSubtopics ?? [])];
  const isRecoveryFocus = focusSubtopics.length > 0;
  const allowedTopics = isRecoveryFocus
    ? DOMAIN_HIERARCHIES.filter((hierarchy) => params.domains.includes(hierarchy.domain)).flatMap(
        (hierarchy) => hierarchy.subtopics
      )
    : params.subtopics;
  const pool = await prisma.question.findMany({
    where: {
      isActive: true,
      domain: { in: params.domains },
      difficulty: params.difficulty,
      ...(allowedTopics.length > 0 ? { topic: { in: allowedTopics } } : {}),
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

  if (isRecoveryFocus) {
    const { direct: directTarget } = getRecoveryDistribution(params.count);
    const directRows = shuffle(pool.filter((question) => focusSubtopics.includes(question.topic)));
    const broaderRows = shuffle(pool.filter((question) => !focusSubtopics.includes(question.topic)));
    const unseen = (rows: typeof pool) => rows.filter((question) => !lastSeen.has(question.id));
    const directQuestions: QuestionInternal[] = [];
    const addDirect = (question: QuestionInternal) => {
      if (directQuestions.length < directTarget) directQuestions.push(question);
    };
    unseen(directRows).forEach((row) => addDirect(toInternalQuestion(row)));

    let feedbackSignals: Awaited<ReturnType<typeof loadRelevantFeedback>> = [];
    if (directQuestions.length < directTarget && isAiGenerationConfigured()) {
      feedbackSignals = await loadRelevantFeedback(params.domains, focusSubtopics);
      try {
        const generated = await generateMissingQuestions(
          directTarget - directQuestions.length,
          params.domains,
          params.difficulty,
          focusSubtopics,
          pool.map((question) => question.stem),
          feedbackSignals
        );
        generated.forEach(addDirect);
      } catch (error) {
        console.error("[questoes] geração de recuperação direta indisponível:", (error as Error).message);
      }
    }

    if (directQuestions.length < directTarget) {
      throw new InsufficientQuestionsError(directQuestions.length, directTarget);
    }
    directQuestions.forEach(add);
    unseen(broaderRows).forEach((row) => add(toInternalQuestion(row)));

    if (picked.length < params.count && isAiGenerationConfigured()) {
      feedbackSignals = feedbackSignals.length
        ? feedbackSignals
        : await loadRelevantFeedback(params.domains, focusSubtopics);
      const broaderTopics = allowedTopics.filter((topic) => !focusSubtopics.includes(topic));
      try {
        const generated = await generateMissingQuestions(
          params.count - picked.length,
          params.domains,
          params.difficulty,
          broaderTopics,
          pool.map((question) => question.stem),
          feedbackSignals,
          focusSubtopics
        );
        generated.forEach(add);
      } catch (error) {
        console.error("[questoes] geração de recuperação complementar indisponível:", (error as Error).message);
      }
    }
  } else {
    shuffle(pool.filter((q) => !lastSeen.has(q.id))).forEach((q) => add(toInternalQuestion(q)));

    if (picked.length < params.count && isAiGenerationConfigured()) {
      try {
        const feedbackSignals = await loadRelevantFeedback(
          params.domains,
          params.subtopics.length > 0 ? params.subtopics : allowedTopics
        );
        const generated = await generateMissingQuestions(
          params.count - picked.length,
          params.domains,
          params.difficulty,
          params.subtopics,
          pool.map((q) => q.stem),
          feedbackSignals
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
  }

  if (picked.length < params.count) {
    throw new InsufficientQuestionsError(picked.length, params.count);
  }

  return shuffle(picked);
}

async function loadRelevantFeedback(
  domains: ExamDomain[],
  topics: string[]
): Promise<
  Array<{
    id: string;
    category: "ERRADA" | "REPETIDA" | "DIFICULDADE_INCORRETA";
    difficulty: QuestionDifficulty;
    direction?: "MAIS_FACIL" | "MAIS_DIFICIL";
    topic: string;
  }>
> {
  if (topics.length === 0) return [];
  const feedback = await prisma.questionFeedback.findMany({
    where: {
      domain: { in: domains },
      topic: { in: topics },
      createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      category: true,
      difficulty: true,
      difficultyDirection: true,
      topic: true,
    },
  });
  return feedback.flatMap((row) => {
    if (
      row.category !== "ERRADA" &&
      row.category !== "REPETIDA" &&
      row.category !== "DIFICULDADE_INCORRETA"
    ) {
      return [];
    }
    const difficulty = QUESTION_DIFFICULTIES.find((level) => level === row.difficulty);
    if (!difficulty) return [];
    return [
      {
        id: row.id,
        category: row.category,
        difficulty,
        ...(row.difficultyDirection === "MAIS_FACIL" ||
        row.difficultyDirection === "MAIS_DIFICIL"
          ? { direction: row.difficultyDirection }
          : {}),
        topic: row.topic,
      },
    ];
  });
}
