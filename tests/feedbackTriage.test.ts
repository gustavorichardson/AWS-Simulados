import { describe, expect, it } from "vitest";
import { findSimilarFeedback, FeedbackForTriage } from "../src/lib/feedback-triage";

function feedback(overrides: Partial<FeedbackForTriage> = {}): FeedbackForTriage {
  return {
    id: "feedback-1",
    userId: "user-1",
    attemptId: "attempt-1",
    questionId: "question-1",
    category: "RESPOSTA_VICIADA",
    difficultyDirection: null,
    issueLocation: null,
    reportedAnswer: "Amazon GuardDuty",
    detail: "O serviço aparece como resposta em vários cenários.",
    difficulty: "MEDIUM",
    domain: "Domínio 2: Segurança e Conformidade",
    topic: "Amazon GuardDuty",
    triageStatus: "PENDING",
    triageReason: null,
    duplicateOfId: null,
    actionTaken: null,
    triagedAt: null,
    createdAt: new Date("2026-10-29T10:00:00.000Z"),
    usedAt: null,
    resolvedAt: null,
    question: { stem: "Qual serviço identifica atividade maliciosa em uma conta AWS?" },
    ...overrides,
  } as FeedbackForTriage;
}

describe("deduplicação da triagem de feedback", () => {
  it("reconhece o mesmo serviço reportado como resposta viciada", () => {
    const current = feedback();
    const prior = feedback({
      id: "feedback-prior",
      attemptId: "attempt-2",
      questionId: "question-2",
      reportedAnswer: "Amazon GuardDuty",
    });

    expect(findSimilarFeedback(current, [prior])?.id).toBe("feedback-prior");
  });

  it("não agrupa questões diferentes com categorias ou tópicos distintos", () => {
    const current = feedback();
    const other = feedback({
      id: "feedback-other",
      category: "REPETIDA",
      topic: "AWS IAM",
      reportedAnswer: null,
      questionId: "question-other",
    });

    expect(findSimilarFeedback(current, [other])).toBeUndefined();
  });
});
