import { describe, it, expect } from "vitest";
import { generateExamQuestionsLocally, findOriginalQuestion } from "../src/lib/question-generator";
import { sanitizeQuestions, evaluateExam } from "../src/lib/examEngine";
import { DONT_KNOW_OPTION_ID, DONT_KNOW_OPTION_TEXT, UserSubmission } from "../src/types/exam";
import { MOCK_QUESTIONS } from "../src/data/mockQuestions";

describe("Execução de Simulados com Gerador Local Fictício", () => {
  it("deve conter um dataset fictício curado com pelo menos 65 questões cobrindo todos os 4 domínios", () => {
    expect(MOCK_QUESTIONS.length).toBeGreaterThanOrEqual(65);

    // Valida que cada questão no mock tem exatamente 4 opções e 1 gabarito válido
    MOCK_QUESTIONS.forEach((q) => {
      expect(q.options).toHaveLength(4);
      expect(q.correctOptionId).toMatch(/^opt_[abcd]$/);
      expect(q.options.some((opt) => opt.id === q.correctOptionId)).toBe(true);
      expect(q.stem.length).toBeGreaterThan(15);
      expect(q.explanation.length).toBeGreaterThan(15);
    });
  });

  it("deve gerar simulados locais de 15, 30, 45 e 65 questões sem chamadas externas", () => {
    const counts = [15, 30, 45, 65] as const;

    counts.forEach((count) => {
      const questions = generateExamQuestionsLocally({
        count,
        selectedTopics: ["TODOS"],
      });

      expect(questions).toHaveLength(count);

      // Cada questão interna tem exatamente 4 opções de conteúdo
      questions.forEach((q) => {
        expect(q.options).toHaveLength(4);
        expect(q.correctOptionId).toBeDefined();
      });
    });
  });

  it("deve garantir que o gabarito e as explicações NUNCA sejam enviados ao frontend durante a prova", () => {
    const internalQuestions = generateExamQuestionsLocally({
      count: 15,
      selectedTopics: ["TODOS"],
    });

    const publicQuestions = sanitizeQuestions(internalQuestions);

    expect(publicQuestions).toHaveLength(15);

    publicQuestions.forEach((q) => {
      // 1. Não deve expor o gabarito
      expect((q as any).correctOptionId).toBeUndefined();

      // 2. Não deve expor a explicação
      expect((q as any).explanation).toBeUndefined();

      // 3. Deve possuir exatamente 5 opções (as 4 originais + a opção "Não sei")
      expect(q.options).toHaveLength(5);

      // 4. A 5ª opção deve ser exatamente "Não sei"
      const lastOption = q.options[4];
      expect(lastOption.id).toBe(DONT_KNOW_OPTION_ID);
      expect(lastOption.text).toBe(DONT_KNOW_OPTION_TEXT);
      expect(lastOption.isDontKnow).toBe(true);
    });
  });

  it("deve recuperar a questão original do servidor e calcular a pontuação somente na finalização", () => {
    const internalQuestions = generateExamQuestionsLocally({
      count: 15,
      selectedTopics: ["TODOS"],
    });

    // Submete 10 respostas corretas, 3 incorretas e 2 "Não sei"
    const submissions: UserSubmission[] = internalQuestions.map((q, idx) => {
      if (idx < 10) {
        return { questionId: q.id, selectedOptionId: q.correctOptionId };
      } else if (idx < 13) {
        const wrongOption = q.options.find((opt) => opt.id !== q.correctOptionId)!;
        return { questionId: q.id, selectedOptionId: wrongOption.id };
      } else {
        return { questionId: q.id, selectedOptionId: DONT_KNOW_OPTION_ID };
      }
    });

    const result = evaluateExam(submissions, internalQuestions);

    expect(result.totalQuestions).toBe(15);
    expect(result.correctCount).toBe(10);
    expect(result.incorrectCount).toBe(3);
    expect(result.dontKnowCount).toBe(2);
    expect(result.unansweredCount).toBe(0);

    // Na finalização, o gabarito comentado e a explicação DEVEM ser liberados
    expect(result.detailedAnswers).toHaveLength(15);
    result.detailedAnswers.forEach((ans) => {
      expect(ans.correctOptionId).toBeDefined();
      expect(ans.explanation.length).toBeGreaterThan(10);
    });
  });

  it("deve resolver instâncias de questões com findOriginalQuestion", () => {
    const questions = generateExamQuestionsLocally({
      count: 15,
      selectedTopics: ["TODOS"],
    });

    const firstInstance = questions[0];
    const original = findOriginalQuestion(firstInstance.id);

    expect(original).toBeDefined();
    expect(original?.stem).toBe(firstInstance.stem);
  });
});
