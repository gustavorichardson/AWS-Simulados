import { describe, it, expect } from "vitest";
import {
  sanitizeQuestion,
  sanitizeQuestions,
  isValidQuestionCount,
  evaluateExam,
} from "../src/lib/examEngine";
import { MOCK_QUESTIONS } from "../src/data/mockQuestions";
import {
  DONT_KNOW_OPTION_ID,
  DONT_KNOW_OPTION_TEXT,
  QuestionInternal,
  UserSubmission,
} from "../src/types/exam";

describe("Motor do Simulado AWS CLF-C02 (examEngine)", () => {
  const sampleQuestion: QuestionInternal = {
    id: "test-q1",
    domain: "Domínio 2: Segurança e Conformidade",
    topic: "AWS IAM",
    stem: "Qual recurso do IAM concede permissões temporárias?",
    options: [
      { id: "opt_a", text: "Usuários do IAM" },
      { id: "opt_b", text: "Grupos do IAM" },
      { id: "opt_c", text: "Funções (IAM Roles)" },
      { id: "opt_d", text: "Políticas gerenciadas" },
    ],
    correctOptionId: "opt_c",
    explanation: "IAM Roles fornecem credenciais temporárias para usuários ou serviços.",
  };

  describe("Validação de Tamanho do Simulado", () => {
    it("deve aceitar apenas 15, 30, 45 ou 65 questões", () => {
      expect(isValidQuestionCount(15)).toBe(true);
      expect(isValidQuestionCount(30)).toBe(true);
      expect(isValidQuestionCount(45)).toBe(true);
      expect(isValidQuestionCount(65)).toBe(true);

      // Quantidades inválidas
      expect(isValidQuestionCount(10)).toBe(false);
      expect(isValidQuestionCount(20)).toBe(false);
      expect(isValidQuestionCount(50)).toBe(false);
      expect(isValidQuestionCount(0)).toBe(false);
      expect(isValidQuestionCount(-1)).toBe(false);
    });
  });

  describe("Sanitização e Proteção do Gabarito", () => {
    it("deve adicionar a quinta opção obrigatória 'Não sei' em todas as questões", () => {
      const sanitized = sanitizeQuestion(sampleQuestion);

      expect(sanitized.options).toHaveLength(5);
      const dontKnowOption = sanitized.options[4];
      expect(dontKnowOption.id).toBe(DONT_KNOW_OPTION_ID);
      expect(dontKnowOption.text).toBe(DONT_KNOW_OPTION_TEXT);
      expect(dontKnowOption.isDontKnow).toBe(true);
    });

    it("NUNCA deve expor o gabarito (correctOptionId) nem a explicação no payload sanitizado", () => {
      const sanitized = sanitizeQuestion(sampleQuestion);

      // Verificação em tempo de execução: as propriedades não devem existir
      expect((sanitized as any).correctOptionId).toBeUndefined();
      expect((sanitized as any).explanation).toBeUndefined();
    });

    it("deve sanitizar corretamente uma lista de questões", () => {
      const sanitizedList = sanitizeQuestions(MOCK_QUESTIONS);
      expect(sanitizedList.length).toBe(MOCK_QUESTIONS.length);
      sanitizedList.forEach((q) => {
        expect(q.options).toHaveLength(5);
        expect(q.options[4].id).toBe(DONT_KNOW_OPTION_ID);
        expect((q as any).correctOptionId).toBeUndefined();
      });
    });
  });

  describe("Avaliação e Diferenciação de Respostas", () => {
    it("deve classificar uma resposta correta, errada, 'Não sei' e não respondida com precisão", () => {
      const q1 = { ...sampleQuestion, id: "q1", correctOptionId: "opt_a" };
      const q2 = { ...sampleQuestion, id: "q2", topic: "VPC", correctOptionId: "opt_b" };
      const q3 = { ...sampleQuestion, id: "q3", topic: "S3", correctOptionId: "opt_c" };
      const q4 = { ...sampleQuestion, id: "q4", topic: "EC2", correctOptionId: "opt_d" };

      const submissions: UserSubmission[] = [
        { questionId: "q1", selectedOptionId: "opt_a" }, // CORRETA
        { questionId: "q2", selectedOptionId: "opt_c" }, // ERRADA
        { questionId: "q3", selectedOptionId: DONT_KNOW_OPTION_ID }, // NÃO SEI
        // q4 não enviada -> NÃO RESPONDIDA
      ];

      const result = evaluateExam(submissions, [q1, q2, q3, q4]);

      expect(result.totalQuestions).toBe(4);
      expect(result.correctCount).toBe(1);
      expect(result.incorrectCount).toBe(1);
      expect(result.dontKnowCount).toBe(1);
      expect(result.unansweredCount).toBe(1);
      expect(result.percentageScore).toBe(25);

      // Escala AWS estimada: 100 + (1/4)*900 = 325 (reprovado < 700)
      expect(result.estimatedScaledScore).toBe(325);
      expect(result.isPassed).toBe(false);

      // Tópicos de recuperação devem conter as questões erradas ou marcadas com 'Não sei'
      expect(result.recoveryTopics).toContain("VPC");
      expect(result.recoveryTopics).toContain("S3");
      expect(result.recoveryTopics).not.toContain("AWS IAM"); // q1 foi acertada!
    });

    it("deve calcular aprovação quando o score for maior ou igual a 700", () => {
      const questions = Array.from({ length: 10 }, (_, i) => ({
        ...sampleQuestion,
        id: `q-${i}`,
        correctOptionId: "opt_a",
      }));

      // 8 acertos em 10 (80%) -> 100 + 0.8 * 900 = 820 -> Aprovado
      const submissions: UserSubmission[] = questions.map((q, index) => ({
        questionId: q.id,
        selectedOptionId: index < 8 ? "opt_a" : "opt_b",
      }));

      const result = evaluateExam(submissions, questions);
      expect(result.correctCount).toBe(8);
      expect(result.percentageScore).toBe(80);
      expect(result.estimatedScaledScore).toBe(820);
      expect(result.isPassed).toBe(true);
    });
  });
});
