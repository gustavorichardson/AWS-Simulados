export const FEEDBACK_CATEGORIES = [
  "ERRADA",
  "REPETIDA",
  "DIFICULDADE_INCORRETA",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface FeedbackMetricRecord {
  id: string;
  category: FeedbackCategory;
  difficulty: string;
  domain: string;
  topic: string;
  createdAt: Date;
  promptUses: Array<{
    usedAt: Date;
    implementedAt: Date | null;
    generatedQuestionIds: string[];
  }>;
  resolvedAt: Date | null;
}

export interface FeedbackCategoryMetrics {
  category: FeedbackCategory;
  received: number;
  appliedInGeneration: number;
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
    const applied = records.filter((item) => item.promptUses.length > 0).length;
    const recurrent = records.filter((item) => recurrentFeedbackIds.has(item.id)).length;
    return {
      category,
      received: records.length,
      appliedInGeneration: applied,
      pending: records.length - applied,
      correctionsImplemented: records.filter((item) =>
        item.promptUses.some((use) => use.implementedAt !== null)
      ).length,
      resolvedWithEvidence: records.filter((item) => item.resolvedAt !== null).length,
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
