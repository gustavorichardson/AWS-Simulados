import { describe, expect, it } from "vitest";
import {
  calculateFeedbackCategoryMetrics,
  classifyQualityTrend,
  FeedbackMetricRecord,
} from "../src/lib/feedback-analytics";

describe("métricas observáveis de feedback", () => {
  it("separa feedback recebido, aplicado, implementado, pendente e reincidente", () => {
    const feedback: FeedbackMetricRecord[] = [
      {
        id: "feedback-1",
        category: "REPETIDA",
        difficulty: "MEDIUM",
        domain: "Domínio 3",
        topic: "Amazon S3",
        createdAt: new Date("2026-10-01T10:00:00.000Z"),
        promptUses: [
          {
            usedAt: new Date("2026-10-02T10:00:00.000Z"),
            generatedAt: new Date("2026-10-02T10:01:00.000Z"),
            generatedQuestionIds: ["new-1"],
          },
        ],
        resolvedAt: new Date("2026-10-10T10:00:00.000Z"),
      },
      {
        id: "feedback-2",
        category: "REPETIDA",
        difficulty: "MEDIUM",
        domain: "Domínio 3",
        topic: "Amazon S3",
        createdAt: new Date("2026-10-03T10:00:00.000Z"),
        promptUses: [],
        resolvedAt: null,
      },
      {
        id: "feedback-3",
        category: "DIFICULDADE_INCORRETA",
        difficulty: "HARD",
        domain: "Domínio 2",
        topic: "AWS IAM",
        createdAt: new Date("2026-10-04T10:00:00.000Z"),
        promptUses: [],
        resolvedAt: null,
      },
    ];
    const metrics = calculateFeedbackCategoryMetrics(feedback, new Set(["feedback-1"]));

    expect(metrics.find((item) => item.category === "REPETIDA")).toMatchObject({
      received: 2,
      appliedInGeneration: 1,
      pending: 1,
      correctionsImplemented: 0,
      generationOutputsCreated: 1,
      resolvedWithEvidence: 1,
      recurrences: 1,
      recurrenceRate: 100,
    });
    expect(metrics.find((item) => item.category === "DIFICULDADE_INCORRETA")).toMatchObject({
      received: 1,
      appliedInGeneration: 0,
      pending: 1,
      recurrenceRate: null,
    });
  });

  it("não declara tendência sem evidências e compara taxas normalizadas", () => {
    expect(classifyQualityTrend(null, 4)).toBe("DADOS_INSUFICIENTES");
    expect(classifyQualityTrend(1, 3)).toBe("MELHORANDO");
    expect(classifyQualityTrend(4, 2)).toBe("PIORANDO");
    expect(classifyQualityTrend(2, 2.2)).toBe("ESTAVEL");
  });

  it("separa duplicatas de feedbacks únicos e mantém triagem pendente explícita", () => {
    const feedback: FeedbackMetricRecord[] = [
      {
        id: "unique",
        category: "RESPOSTA_VICIADA",
        difficulty: "MEDIUM",
        domain: "Domínio 2",
        topic: "Amazon GuardDuty",
        createdAt: new Date("2026-10-10T10:00:00.000Z"),
        triageStatus: "AWAITING_VALIDATION",
        promptUses: [],
        resolvedAt: null,
      },
      {
        id: "duplicate",
        category: "RESPOSTA_VICIADA",
        difficulty: "MEDIUM",
        domain: "Domínio 2",
        topic: "Amazon GuardDuty",
        createdAt: new Date("2026-10-11T10:00:00.000Z"),
        triageStatus: "DUPLICATE",
        duplicateOfId: "unique",
        promptUses: [],
        resolvedAt: null,
      },
    ];

    expect(calculateFeedbackCategoryMetrics(feedback, new Set()).find(
      (item) => item.category === "RESPOSTA_VICIADA"
    )).toMatchObject({
      received: 2,
      unique: 1,
      duplicates: 1,
      pendingTriage: 1,
      appliedInGeneration: 0,
    });
  });
});
