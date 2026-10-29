// ============================================================================
// SERVIÇO DE SIMULADOS (SERVIDOR)
// Toda operação recebe o userId da sessão e valida a posse do simulado.
// O gabarito e as explicações nunca saem daqui antes da finalização e,
// no Modo Prova, nunca saem.
// ============================================================================
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { evaluateExam, sanitizeQuestion } from "./examEngine";
import {
  InsufficientQuestionsError,
  selectQuestionsForUser,
  shuffle,
  toInternalQuestion,
} from "./question-generator";
import { ALL_DOMAINS_KEY, resolveSelectedDomains } from "./topic-selection";
import { findDomainBySubtopic, getAllSubtopics } from "../types/subtopics";
import {
  DONT_KNOW_OPTION_ID,
  ExamDomain,
  ExamEvaluationResult,
  ExamMode,
  ExamResultView,
  QuestionInternal,
  QuestionDifficulty,
  QuestionPublicView,
  StudyFeedback,
  UnknownOptionSelection,
  QUESTION_DIFFICULTIES,
  VALID_QUESTION_COUNTS,
} from "../types/exam";

export class ExamServiceError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ExamServiceError";
  }
}

const OPTION_IDS = ["opt_a", "opt_b", "opt_c", "opt_d"];
export const RECOVERY_QUESTION_COUNT = 15;

export const StartExamSchema = z.object({
  questionCount: z
    .number()
    .int()
    .refine((n) => (VALID_QUESTION_COUNTS as readonly number[]).includes(n), {
      message: "Quantidade de questões inválida.",
    }),
  mode: z.enum(["ESTUDO", "PROVA"]),
  difficulty: z.enum(QUESTION_DIFFICULTIES).default("MEDIUM"),
  selectedTopics: z.array(z.string().max(100)).max(10).default([ALL_DOMAINS_KEY]),
  selectedSubtopics: z.array(z.string().max(150)).max(100).default([]),
});
export type StartExamInput = z.input<typeof StartExamSchema>;

export const AnswersSchema = z
  .record(z.string().max(100), z.string().max(40))
  .refine((r) => Object.keys(r).length <= 65, { message: "Respostas em excesso." });
const UnknownOptionsSchema = z
  .record(
    z.string().max(100),
    z.array(z.enum(OPTION_IDS)).max(4)
  )
  .refine((r) => Object.keys(r).length <= 65, { message: "Marcações em excesso." });
const QuestionFeedbackSchema = z
  .object({
    questionId: z.string().min(1).max(100),
    category: z.enum(["ERRADA", "REPETIDA", "DIFICULDADE_INCORRETA"]),
    active: z.boolean(),
    difficultyDirection: z.enum(["MAIS_FACIL", "MAIS_DIFICIL"]).optional(),
  })
  .superRefine((feedback, context) => {
    if (feedback.category === "DIFICULDADE_INCORRETA" && !feedback.difficultyDirection) {
      context.addIssue({
        code: "custom",
        message: "Informe se a questão está mais fácil ou mais difícil do que deveria.",
        path: ["difficultyDirection"],
      });
    }
  });

export const RecoverySchema = z.object({
  mode: z.enum(["ESTUDO", "PROVA"]).optional(),
});

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ExamServiceError(400, result.error.issues[0]?.message ?? "Dados inválidos.");
  }
  return result.data;
}

const attemptInclude = {
  answers: { include: { question: true }, orderBy: { position: "asc" } },
  feedback: true,
} satisfies Prisma.ExamAttemptInclude;

type AttemptWithAnswers = Prisma.ExamAttemptGetPayload<{ include: typeof attemptInclude }>;

/** Busca o simulado somente se pertencer ao usuário. Simulados de outras contas retornam 404. */
async function loadOwnedAttempt(userId: string, attemptId: string): Promise<AttemptWithAnswers> {
  if (typeof attemptId !== "string" || attemptId.length === 0 || attemptId.length > 100) {
    throw new ExamServiceError(404, "Simulado não encontrado.");
  }
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId },
    include: attemptInclude,
  });
  if (!attempt) throw new ExamServiceError(404, "Simulado não encontrado.");
  return attempt;
}

function orderedInternalQuestion(answer: AttemptWithAnswers["answers"][number]): QuestionInternal {
  const internal = toInternalQuestion(answer.question);
  const order = answer.optionOrder.length === 4 ? answer.optionOrder : OPTION_IDS;
  return {
    ...internal,
    options: order.map((id) => internal.options.find((o) => o.id === id)!),
  };
}

function toPublicQuestions(attempt: AttemptWithAnswers): QuestionPublicView[] {
  return attempt.answers.map((a) => sanitizeQuestion(orderedInternalQuestion(a)));
}

function getStudyFeedback(
  attempt: AttemptWithAnswers,
  selectedAnswers: Record<string, string>
): Record<string, StudyFeedback> {
  const answersByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  return Object.fromEntries(
    Object.entries(selectedAnswers).flatMap(([questionId, selectedOptionId]) => {
      const answer = answersByQuestion.get(questionId);
      if (!answer || !selectedOptionId) return [];
      const question = orderedInternalQuestion(answer);
      const optionExplanations = {
        opt_a:
          question.optionExplanations?.opt_a ??
          (question.correctOptionId === "opt_a"
            ? question.explanation
            : "Esta alternativa não atende ao requisito solicitado no enunciado."),
        opt_b:
          question.optionExplanations?.opt_b ??
          (question.correctOptionId === "opt_b"
            ? question.explanation
            : "Esta alternativa não atende ao requisito solicitado no enunciado."),
        opt_c:
          question.optionExplanations?.opt_c ??
          (question.correctOptionId === "opt_c"
            ? question.explanation
            : "Esta alternativa não atende ao requisito solicitado no enunciado."),
        opt_d:
          question.optionExplanations?.opt_d ??
          (question.correctOptionId === "opt_d"
            ? question.explanation
            : "Esta alternativa não atende ao requisito solicitado no enunciado."),
      };
      return [
        [
          questionId,
          {
            isCorrect: selectedOptionId === question.correctOptionId,
            correctOptionId: question.correctOptionId,
            optionExplanations,
          },
        ],
      ];
    })
  );
}

function validateAnswers(attempt: AttemptWithAnswers, answers: Record<string, string>) {
  const byQuestion = new Map(attempt.answers.map((a) => [a.questionId, a]));
  for (const [questionId, optionId] of Object.entries(answers)) {
    const row = byQuestion.get(questionId);
    if (!row) throw new ExamServiceError(400, "Resposta para questão que não pertence ao simulado.");
    if (optionId !== DONT_KNOW_OPTION_ID && !OPTION_IDS.includes(optionId)) {
      throw new ExamServiceError(400, "Alternativa inválida.");
    }
    if (
      attempt.mode === "ESTUDO" &&
      row.selectedOptionId &&
      row.selectedOptionId !== optionId
    ) {
      throw new ExamServiceError(409, "Esta resposta já foi confirmada e não pode ser alterada.");
    }
  }
}

export function buildResultView(
  attempt: AttemptWithAnswers,
  evaluation: ExamEvaluationResult
): ExamResultView {
  const { detailedAnswers, ...summary } = evaluation;
  const mode = attempt.mode as ExamMode;
  return {
    ...summary,
    attemptId: attempt.id,
    mode,
    isRecovery: attempt.isRecovery,
    finishedAt: attempt.finishedAt ? attempt.finishedAt.toISOString() : null,
    ...(mode === "ESTUDO"
      ? {
          detailedAnswers,
          unknownOptions: attempt.answers.flatMap((answer): UnknownOptionSelection[] => {
            const question = orderedInternalQuestion(answer);
            return answer.unknownOptionIds.flatMap((optionId) => {
              const option = question.options.find((item) => item.id === optionId);
              return option
                ? [
                    {
                      questionId: question.id,
                      topic: question.topic,
                      domain: question.domain,
                      optionId,
                      optionText: option.text,
                    },
                  ]
                : [];
            });
          }),
        }
      : {}),
  };
}

interface StartOptions {
  isRecovery?: boolean;
  sourceAttemptId?: string;
}

export async function startExam(userId: string, rawInput: unknown, options: StartOptions = {}) {
  const input = parse(StartExamSchema, rawInput);
  const isRecovery = !!options.isRecovery;

  const allSubtopics = new Set(getAllSubtopics());
  const subtopics = [...new Set(input.selectedSubtopics)];
  if (subtopics.some((s) => !allSubtopics.has(s))) {
    throw new ExamServiceError(400, "Tópico inválido.");
  }

  let domains: ExamDomain[];
  if (isRecovery) {
    domains = [...new Set(subtopics.map((s) => findDomainBySubtopic(s)!))];
  } else {
    domains = resolveSelectedDomains(input.selectedTopics);
    if (subtopics.some((s) => !domains.includes(findDomainBySubtopic(s)!))) {
      throw new ExamServiceError(400, "Tópico fora dos domínios selecionados.");
    }
  }
  if (domains.length === 0) throw new ExamServiceError(400, "Selecione ao menos um domínio.");

  let questions: QuestionInternal[];
  try {
    questions = await selectQuestionsForUser({
      userId,
      count: input.questionCount,
      difficulty: input.difficulty,
      domains,
      subtopics,
      ...(isRecovery ? { focusSubtopics: subtopics } : {}),
      allowSeenReuse: !isRecovery,
    });
  } catch (error) {
    if (error instanceof InsufficientQuestionsError) {
      throw new ExamServiceError(409, error.message);
    }
    throw error;
  }

  const attempt = await prisma.examAttempt.create({
    data: {
      userId,
      questionCount: input.questionCount,
      difficulty: input.difficulty,
      selectedDomains: domains,
      selectedSubtopics: subtopics,
      mode: input.mode,
      isRecovery,
      sourceAttemptId: options.sourceAttemptId ?? null,
      answers: {
        create: questions.map((q, position) => ({
          questionId: q.id,
          position,
          optionOrder: shuffle(OPTION_IDS),
          status: "NAO_RESPONDIDA",
        })),
      },
    },
    include: attemptInclude,
  });

  return {
    attemptId: attempt.id,
    mode: attempt.mode as ExamMode,
    difficulty: attempt.difficulty as QuestionDifficulty,
    isRecovery: attempt.isRecovery,
    questions: toPublicQuestions(attempt),
  };
}

export async function getAttemptForUser(userId: string, attemptId: string) {
  const attempt = await loadOwnedAttempt(userId, attemptId);
  if (attempt.finishedAt) {
    return { attemptId: attempt.id, mode: attempt.mode as ExamMode, finished: true as const };
  }
  const answers: Record<string, string> = {};
  for (const a of attempt.answers) if (a.selectedOptionId) answers[a.questionId] = a.selectedOptionId;
  return {
    attemptId: attempt.id,
    mode: attempt.mode as ExamMode,
    difficulty: attempt.difficulty as QuestionDifficulty,
    isRecovery: attempt.isRecovery,
    finished: false as const,
    questions: toPublicQuestions(attempt),
    answers,
    ...(attempt.mode === "ESTUDO"
      ? {
          studyFeedback: getStudyFeedback(attempt, answers),
          unknownOptions: Object.fromEntries(
            attempt.answers.map((answer) => [answer.questionId, answer.unknownOptionIds])
          ),
          questionFeedback: Object.fromEntries(
            attempt.feedback.map((feedback) => [
              feedback.questionId,
              {
                category: feedback.category,
                difficultyDirection: feedback.difficultyDirection,
              },
            ])
          ),
        }
      : {}),
  };
}

export async function saveProgress(
  userId: string,
  attemptId: string,
  rawAnswers: unknown,
  rawUnknownOptions: unknown = {}
) {
  const answers = parse(AnswersSchema, rawAnswers);
  const unknownOptions = parse(UnknownOptionsSchema, rawUnknownOptions);
  const attempt = await loadOwnedAttempt(userId, attemptId);
  if (attempt.finishedAt) throw new ExamServiceError(409, "Este simulado já foi finalizado.");
  validateAnswers(attempt, answers);
  if (Object.keys(unknownOptions).length > 0 && attempt.mode !== "ESTUDO") {
    throw new ExamServiceError(400, "A marcação de alternativas desconhecidas está disponível no Modo Estudo.");
  }
  const answerByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  for (const [questionId, optionIds] of Object.entries(unknownOptions)) {
    if (!answerByQuestion.has(questionId)) {
      throw new ExamServiceError(400, "Marcação para questão que não pertence ao simulado.");
    }
    if (optionIds.some((optionId) => !OPTION_IDS.includes(optionId))) {
      throw new ExamServiceError(400, "Alternativa desconhecida inválida.");
    }
  }

  const updates = [
    ...Object.entries(answers).map(([questionId, selectedOptionId]) =>
      prisma.examAnswer.update({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
        data: { selectedOptionId, answeredAt: new Date() },
      })
    ),
    ...Object.entries(unknownOptions).map(([questionId, unknownOptionIds]) =>
      prisma.examAnswer.update({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
        data: { unknownOptionIds },
      })
    ),
  ];
  if (updates.length > 0) await prisma.$transaction(updates);
  return {
    saved: Object.keys(answers).length,
    ...(attempt.mode === "ESTUDO" ? { studyFeedback: getStudyFeedback(attempt, answers) } : {}),
  };
}

export async function saveQuestionFeedback(
  userId: string,
  attemptId: string,
  rawFeedback: unknown
) {
  const feedback = parse(QuestionFeedbackSchema, rawFeedback);
  const attempt = await loadOwnedAttempt(userId, attemptId);
  if (attempt.finishedAt) throw new ExamServiceError(409, "Este simulado já foi finalizado.");
  if (attempt.mode !== "ESTUDO") {
    throw new ExamServiceError(400, "O feedback de qualidade está disponível no Modo Estudo.");
  }
  const answer = attempt.answers.find((row) => row.questionId === feedback.questionId);
  if (!answer) throw new ExamServiceError(400, "Questão que não pertence ao simulado.");

  const unique = {
    attemptId_questionId_category: {
      attemptId: attempt.id,
      questionId: answer.questionId,
      category: feedback.category,
    },
  };
  if (!feedback.active) {
    await prisma.questionFeedback.deleteMany({
      where: {
        attemptId: attempt.id,
        questionId: answer.questionId,
        category: feedback.category,
        userId,
      },
    });
    return { saved: false };
  }

  await prisma.questionFeedback.upsert({
    where: unique,
    create: {
      userId,
      attemptId: attempt.id,
      questionId: answer.questionId,
      category: feedback.category,
      difficultyDirection:
        feedback.category === "DIFICULDADE_INCORRETA"
          ? feedback.difficultyDirection
          : null,
      difficulty: attempt.difficulty,
      domain: answer.question.domain,
      topic: answer.question.topic,
    },
    update: {
      difficultyDirection:
        feedback.category === "DIFICULDADE_INCORRETA"
          ? feedback.difficultyDirection
          : null,
    },
  });
  return { saved: true };
}

function evaluateAttempt(attempt: AttemptWithAnswers, overrides: Record<string, string> = {}) {
  const questions = attempt.answers.map(orderedInternalQuestion);
  const submissions = attempt.answers.map((a) => ({
    questionId: a.questionId,
    selectedOptionId: overrides[a.questionId] ?? a.selectedOptionId,
  }));
  return evaluateExam(submissions, questions);
}

async function refreshProfileStats(tx: Prisma.TransactionClient, userId: string) {
  const finished = { userId, finishedAt: { not: null } };
  const [aggregate, passed] = await Promise.all([
    tx.examAttempt.aggregate({ where: finished, _count: true, _avg: { percentageScore: true } }),
    tx.examAttempt.count({ where: { ...finished, isPassed: true } }),
  ]);
  const stats = {
    totalExamsTaken: aggregate._count,
    totalPassed: passed,
    averageScore: aggregate._avg.percentageScore ?? 0,
  };
  await tx.profile.upsert({ where: { userId }, create: { userId, ...stats }, update: stats });
}

export async function finishExam(userId: string, attemptId: string, rawAnswers: unknown = {}) {
  const answers = parse(AnswersSchema, rawAnswers ?? {});
  const attempt = await loadOwnedAttempt(userId, attemptId);
  if (attempt.finishedAt) throw new ExamServiceError(409, "Este simulado já foi finalizado.");
  validateAnswers(attempt, answers);

  const evaluation = evaluateAttempt(attempt, answers);
  const finishedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const updated = await tx.examAttempt.updateMany({
      where: { id: attempt.id, userId, finishedAt: null },
      data: {
        finishedAt,
        percentageScore: evaluation.percentageScore,
        estimatedScaledScore: evaluation.estimatedScaledScore,
        isPassed: evaluation.isPassed,
        correctCount: evaluation.correctCount,
        incorrectCount: evaluation.incorrectCount,
        dontKnowCount: evaluation.dontKnowCount,
        unansweredCount: evaluation.unansweredCount,
      },
    });
    if (updated.count === 0) throw new ExamServiceError(409, "Este simulado já foi finalizado.");

    for (const answer of evaluation.detailedAnswers) {
      await tx.examAnswer.update({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: answer.questionId } },
        data: { selectedOptionId: answer.selectedOptionId, status: answer.status },
      });
    }
    await refreshProfileStats(tx, userId);
  });

  return buildResultView({ ...attempt, finishedAt }, evaluation);
}

export async function getResult(userId: string, attemptId: string) {
  const attempt = await loadOwnedAttempt(userId, attemptId);
  if (!attempt.finishedAt) {
    throw new ExamServiceError(409, "O resultado fica disponível somente após finalizar o simulado.");
  }
  return buildResultView(attempt, evaluateAttempt(attempt));
}

export async function startRecoveryExam(userId: string, attemptId: string, rawInput: unknown = {}) {
  const input = parse(RecoverySchema, rawInput ?? {});
  const attempt = await loadOwnedAttempt(userId, attemptId);
  if (!attempt.finishedAt) {
    throw new ExamServiceError(409, "Finalize o simulado antes de gerar a recuperação.");
  }
  const topics = [
    ...new Set(
      attempt.answers
        .filter((a) => a.status === "ERRADA" || a.status === "NAO_SEI")
        .map((a) => a.question.topic)
    ),
  ];
  if (topics.length === 0) {
    throw new ExamServiceError(400, "Não há tópicos com erros ou respostas \"Não sei\" neste simulado.");
  }
  return startExam(
    userId,
    {
      questionCount: RECOVERY_QUESTION_COUNT,
      mode: input.mode ?? attempt.mode,
      difficulty: attempt.difficulty as QuestionDifficulty,
      selectedTopics: [ALL_DOMAINS_KEY],
      selectedSubtopics: topics,
    },
    { isRecovery: true, sourceAttemptId: attempt.id }
  );
}

export async function listAttemptsForUser(userId: string) {
  return prisma.examAttempt.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      questionCount: true,
      mode: true,
      isRecovery: true,
      percentageScore: true,
      estimatedScaledScore: true,
      isPassed: true,
      correctCount: true,
      incorrectCount: true,
      dontKnowCount: true,
      unansweredCount: true,
      startedAt: true,
      finishedAt: true,
    },
  });
}
