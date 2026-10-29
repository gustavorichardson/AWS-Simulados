export const FEEDBACK_CATEGORIES = [
  "ERRADA",
  "REPETIDA",
  "DIFICULDADE_INCORRETA",
  "RESPOSTA_VICIADA",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface FeedbackMetricRecord {
  id: string;
  category: FeedbackCategory;
  difficulty: string;
  domain: string;
  topic: string;
  createdAt: Date;
  triageStatus?: string;
  duplicateOfId?: string | null;
  correctionImplementedAt?: Date | null;
  promptUses: Array<{
    usedAt: Date;
    generatedAt: Date | null;
    generatedQuestionIds: string[];
  }>;
  resolvedAt: Date | null;
}

export interface FeedbackCategoryMetrics {
  category: FeedbackCategory;
  received: number;
  unique: number;
  duplicates: number;
  approved: number;
  rejected: number;
  pendingTriage: number;
  appliedInGeneration: number;
  generationOutputsCreated: number;
  pending: number;
  correctionsImplemented: number;
  resolvedWithEvidence: number;
  recurrences: number;
  recurrenceRate: number | null;
}

export function calculateFeedbackCategoryMetrics(
  feedback: FeedbackMetricRecord[],
  recurrentFeedbackIds: Set<string>
): FeedbackCategoryMetrics[] {
  return FEEDBACK_CATEGORIES.map((category) => {
    const records = feedback.filter((item) => item.category === category);
    const uniqueRecords = records.filter((item) => item.triageStatus !== "DUPLICATE");
    const applied = uniqueRecords.filter((item) => item.promptUses.length > 0).length;
    const recurrent = uniqueRecords.filter((item) => recurrentFeedbackIds.has(item.id)).length;
    const statusOf = (item: FeedbackMetricRecord) => item.triageStatus ?? "APPROVED";
    const pending = uniqueRecords.filter((item) => {
      const status = statusOf(item);
      return (
        ["PENDING", "AWAITING_VALIDATION"].includes(status) ||
        (status === "APPROVED" && item.promptUses.length === 0)
      );
    }).length;
    return {
      category,
      received: records.length,
      unique: uniqueRecords.length,
      duplicates: records.length - uniqueRecords.length,
      approved: uniqueRecords.filter((item) => statusOf(item) === "APPROVED").length,
      rejected: uniqueRecords.filter((item) => statusOf(item) === "REJECTED").length,
      pendingTriage: uniqueRecords.filter((item) =>
        ["PENDING", "AWAITING_VALIDATION"].includes(statusOf(item))
      ).length,
      appliedInGeneration: applied,
      generationOutputsCreated: uniqueRecords.filter((item) =>
        item.promptUses.some((use) => use.generatedAt !== null)
      ).length,
      pending,
      correctionsImplemented: uniqueRecords.filter(
        (item) => item.correctionImplementedAt != null
      ).length,
      resolvedWithEvidence: uniqueRecords.filter((item) => item.resolvedAt !== null).length,
      recurrences: recurrent,
      recurrenceRate: applied > 0 ? Math.round((recurrent / applied) * 100) : null,
    };
  });
}

export function classifyQualityTrend(currentRate: number | null, previousRate: number | null) {
  if (currentRate === null || previousRate === null) return "DADOS_INSUFICIENTES" as const;
  const difference = currentRate - previousRate;
  if (difference < -0.5) return "MELHORANDO" as const;
  if (difference > 0.5) return "PIORANDO" as const;
  return "ESTAVEL" as const;
}
