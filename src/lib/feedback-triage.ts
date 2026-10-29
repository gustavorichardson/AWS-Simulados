import type { QuestionFeedback } from "@prisma/client";
import { analyzeFeedbackWithGemini, isAiGenerationConfigured } from "./gemini";
import { prisma } from "./prisma";
import { normalizeText, stemSimilarity } from "./question-quality";

export type FeedbackForTriage = QuestionFeedback & { question: { stem: string } };

function feedbackText(feedback: FeedbackForTriage): string {
  if (feedback.category === "RESPOSTA_VICIADA") {
    return [feedback.reportedAnswer, feedback.detail].filter(Boolean).join(" ");
  }
  return [
    feedback.issueLocation,
    feedback.difficultyDirection,
    feedback.detail,
    feedback.question.stem,
  ]
    .filter(Boolean)
    .join(" ");
}

export function findSimilarFeedback(
  feedback: FeedbackForTriage,
  candidates: FeedbackForTriage[]
): FeedbackForTriage | undefined {
  const text = feedbackText(feedback);
  const normalized = normalizeText(text);
  return candidates.find((candidate) => {
    if (
      candidate.id === feedback.id ||
      candidate.category !== feedback.category ||
      candidate.domain !== feedback.domain ||
      candidate.topic !== feedback.topic ||
      candidate.triageStatus === "DUPLICATE"
    ) {
      return false;
    }
    if (candidate.questionId === feedback.questionId) return true;
    const candidateText = feedbackText(candidate);
    return (
      normalizeText(candidateText) === normalized ||
      stemSimilarity(text, candidateText) >= 0.65
    );
  });
}

export async function triageFeedbackById(feedbackId: string): Promise<void> {
  const feedback = await prisma.questionFeedback.findUnique({
    where: { id: feedbackId },
    include: { question: { select: { stem: true } } },
  });
  if (!feedback || !["PENDING", "AWAITING_VALIDATION"].includes(feedback.triageStatus)) return;

  const candidates = await prisma.questionFeedback.findMany({
    where: {
      id: { not: feedback.id },
      category: feedback.category,
      domain: feedback.domain,
      topic: feedback.topic,
      triageStatus: { not: "DUPLICATE" },
    },
    include: { question: { select: { stem: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  const duplicate = findSimilarFeedback(feedback, candidates);
  if (duplicate) {
    await prisma.questionFeedback.update({
      where: { id: feedback.id },
      data: {
        triageStatus: "DUPLICATE",
        duplicateOfId: duplicate.id,
        triageReason: `Feedback semelhante ao registro ${duplicate.id}.`,
        triagedAt: new Date(),
      },
    });
    return;
  }

  if (!isAiGenerationConfigured()) {
    await prisma.questionFeedback.update({
      where: { id: feedback.id },
      data: {
        triageStatus: "AWAITING_VALIDATION",
        triageReason: "Aguardando chave Gemini para triagem técnica.",
      },
    });
    return;
  }

  try {
    const decision = await analyzeFeedbackWithGemini({
      category: feedback.category,
      issueLocation: feedback.issueLocation,
      reportedAnswer: feedback.reportedAnswer,
      detail: feedback.detail,
      domain: feedback.domain,
      topic: feedback.topic,
      difficulty: feedback.difficulty as "EASY" | "MEDIUM" | "HARD",
      stem: feedback.question.stem,
    });
    const status =
      decision.decision === "APROVAR"
        ? "APPROVED"
        : decision.decision === "REJEITAR"
          ? "REJECTED"
          : "AWAITING_VALIDATION";
    await prisma.questionFeedback.update({
      where: { id: feedback.id },
      data: {
        triageStatus: status,
        triageReason: decision.reason,
        actionTaken:
          status === "APPROVED" ? "SINAL_APROVADO_PARA_PROMPTS_FUTUROS" : null,
        triagedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro desconhecido";
    console.error("[feedback] triagem por IA indisponível:", message);
    await prisma.questionFeedback.update({
      where: { id: feedback.id },
      data: {
        triageStatus: "AWAITING_VALIDATION",
        triageReason: "A triagem por IA falhou; o feedback não será usado em gerações.",
      },
    });
  }
}

export async function triagePendingFeedback(
  domains: string[],
  topics: string[]
): Promise<void> {
  const pending = await prisma.questionFeedback.findMany({
    where: {
      domain: { in: domains },
      topic: { in: topics },
      triageStatus: { in: ["PENDING", "AWAITING_VALIDATION"] },
      createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { id: true },
  });
  for (const feedback of pending) await triageFeedbackById(feedback.id);
}
