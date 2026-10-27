import { describe, it, expect } from "vitest";
import { sanitizeQuestions, evaluateExam } from "../src/lib/examEngine";
import { DONT_KNOW_OPTION_ID, DONT_KNOW_OPTION_TEXT, UserSubmission } from "../src/types/exam";
import { MOCK_QUESTIONS } from "../src/data/mockQuestions";
import { getAllSubtopics } from "../src/types/subtopics";
import { computeStemHash } from "../src/lib/gemini";
import { detectAnswerLeak } from "../src/lib/question-quality";

describe("Banco inicial de questões", () => {
  it("contém pelo menos 65 questões válidas com 4 alternativas e gabarito", () => {
    expect(MOCK_QUESTIONS.length).toBeGreaterThanOrEqual(65);
    MOCK_QUESTIONS.forEach((q) => {
      expect(q.options).toHaveLength(4);
      expect(q.options.some((opt) => opt.id === q.correctOptionId)).toBe(true);
      expect(q.explanation.length).toBeGreaterThan(15);
    });
  });

  it("não possui enunciados duplicados", () => {
    const hashes = new Set(MOCK_QUESTIONS.map((q) => computeStemHash(q.stem)));
    expect(hashes.size).toBe(MOCK_QUESTIONS.length);
  });

  it("usa somente subtópicos oficiais da hierarquia (necessário para a recuperação por tópico)", () => {
    const valid = new Set(getAllSubtopics());
    MOCK_QUESTIONS.forEach((q) => expect(valid.has(q.topic)).toBe(true));
  });

  it("nenhuma questão entrega a resposta por tamanho, repetição de termos ou texto proibido", () => {
    const leaks = MOCK_QUESTIONS.map((q) => ({ id: q.id, leak: detectAnswerLeak(q) })).filter(
      (r) => r.leak
    );
    expect(leaks).toEqual([]);
  });
});

describe("Payload público e avaliação", () => {
  it("o payload público não contém gabarito, explicação nem tópico", () => {
    const publicQuestions = sanitizeQuestions(MOCK_QUESTIONS.slice(0, 15));
    const json = JSON.stringify(publicQuestions);
    expect(json).not.toContain("correctOptionId");
    expect(json).not.toContain("explanation");
    expect(json).not.toContain('"topic"');
    publicQuestions.forEach((q) => {
      expect(q.options).toHaveLength(5);
      expect(q.options[4]).toEqual({ id: DONT_KNOW_OPTION_ID, text: DONT_KNOW_OPTION_TEXT, isDontKnow: true });
      expect(Object.keys(q).sort()).toEqual(["domain", "id", "options", "stem"]);
    });
  });

  it("gera desempenho por tópico com os quatro estados e percentual", () => {
    const questions = MOCK_QUESTIONS.slice(0, 4);
    const submissions: UserSubmission[] = [
      { questionId: questions[0].id, selectedOptionId: questions[0].correctOptionId },
      { questionId: questions[1].id, selectedOptionId: questions[1].options.find((o) => o.id !== questions[1].correctOptionId)!.id },
      { questionId: questions[2].id, selectedOptionId: DONT_KNOW_OPTION_ID },
      { questionId: questions[3].id, selectedOptionId: null },
    ];
    const result = evaluateExam(submissions, questions);
    const totals = result.topicBreakdown.reduce(
      (acc, t) => ({
        total: acc.total + t.total,
        correct: acc.correct + t.correct,
        incorrect: acc.incorrect + t.incorrect,
        dontKnow: acc.dontKnow + t.dontKnow,
        unanswered: acc.unanswered + t.unanswered,
      }),
      { total: 0, correct: 0, incorrect: 0, dontKnow: 0, unanswered: 0 }
    );
    expect(totals).toEqual({ total: 4, correct: 1, incorrect: 1, dontKnow: 1, unanswered: 1 });
    result.topicBreakdown.forEach((t) =>
      expect(t.percentage).toBe(Math.round((t.correct / t.total) * 100))
    );
    expect(result.recoveryTopics.sort()).toEqual([questions[1].topic, questions[2].topic].filter((v, i, a) => a.indexOf(v) === i).sort());
  });
});
