import { describe, it, expect, vi } from "vitest";
import {
  RawGeminiQuestionSchema,
  GeminiQuestionsBatchSchema,
  computeStemHash,
  isDuplicateQuestion,
  generateQuestionsWithGemini,
} from "../src/lib/gemini";

// Mock da SDK do Google GenAI para evitar chamadas de rede nos testes automatizados
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify([
            {
              domain: "Domínio 2: Segurança e Conformidade",
              subtopic: "AWS IAM e Princípio do Menor Privilégio",
              stem: "Uma empresa necessita restringir o acesso a instâncias do Amazon EC2 para que administradores acessem apenas através de credenciais temporárias federadas. Qual serviço atende a essa exigência?",
              options: [
                { id: "opt_a", text: "IAM Roles com AWS STS." },
                { id: "opt_b", text: "Chaves de acesso permanentes do usuário raiz." },
                { id: "opt_c", text: "Políticas gerenciadas públicas do S3." },
                { id: "opt_d", text: "Grupos de segurança sem regras de saída." },
              ],
              correctOptionId: "opt_a",
              explanation: "O AWS Security Token Service (STS) com IAM Roles fornece credenciais temporárias de segurança com expiração automática.",
            },
          ]),
        }),
      },
    })),
    Type: {
      ARRAY: "array",
      OBJECT: "object",
      STRING: "string",
    },
  };
});

describe("Integração Gemini API (Server-Side) e Validação Estruturada com Zod", () => {
  const validQuestion = {
    domain: "Domínio 1: Conceitos de Nuvem",
    subtopic: "Elasticidade e Escalabilidade",
    stem: "Qual vantagem da computação em nuvem permite provisionar e desprovisionar recursos computacionais de forma automatizada conforme a demanda varia?",
    options: [
      { id: "opt_a", text: "Elasticidade" },
      { id: "opt_b", text: "Confiabilidade manual" },
      { id: "opt_c", text: "CapEx estático" },
      { id: "opt_d", text: "Latência fixa" },
    ],
    correctOptionId: "opt_a",
    explanation: "Elasticidade é a capacidade de adquirir recursos à medida que precisa deles e liberar quando não são mais necessários.",
  };

  it("deve validar com sucesso uma questão no schema Zod do Gemini", () => {
    const parsed = RawGeminiQuestionSchema.safeParse(validQuestion);
    expect(parsed.success).toBe(true);
  });

  it("deve rejeitar questões com menos ou mais de 4 alternativas de conteúdo", () => {
    const invalidOptionsQuestion = {
      ...validQuestion,
      options: [
        { id: "opt_a", text: "Opção 1" },
        { id: "opt_b", text: "Opção 2" },
        { id: "opt_c", text: "Opção 3" },
        // Apenas 3 opções -> DEVE FALHAR
      ],
    };

    const parsed = RawGeminiQuestionSchema.safeParse(invalidOptionsQuestion);
    expect(parsed.success).toBe(false);
  });

  it("aceita o nome do domínio sem o prefixo 'Domínio N:'", () => {
    const parsed = RawGeminiQuestionSchema.safeParse({ ...validQuestion, domain: "Conceitos de Nuvem" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.domain).toBe("Domínio 1: Conceitos de Nuvem");
  });

  it("deve rejeitar questões fora dos 4 domínios oficiais do exame CLF-C02", () => {
    const invalidDomainQuestion = {
      ...validQuestion,
      domain: "Domínio Inválido: Redes Avançadas Specialty",
    };

    const parsed = RawGeminiQuestionSchema.safeParse(invalidDomainQuestion);
    expect(parsed.success).toBe(false);
  });

  it("deve calcular o hash normalizado ignorando maiúsculas, acentos e pontuação (Deduplicação)", () => {
    const stem1 = "Qual recurso do IAM concede permissões temporárias?";
    const stem2 = "qual recurso do iam concede permissoes temporarias"; // sem acento e sem interrogação

    const hash1 = computeStemHash(stem1);
    const hash2 = computeStemHash(stem2);

    expect(hash1).toBe(hash2);

    const existing = new Set<string>([hash1]);
    expect(isDuplicateQuestion(stem2, existing)).toBe(true);
    expect(isDuplicateQuestion("Enunciado completamente diferente", existing)).toBe(false);
  });

  it("deve gerar questões mockadas via SDK oficial sem chamadas reais de rede", async () => {
    // Configura chave simulada para o teste
    process.env.GEMINI_API_KEY = "test_key_for_unit_tests";

    const questions = await generateQuestionsWithGemini({
      count: 1,
      domain: "Domínio 2: Segurança e Conformidade",
    });

    expect(questions).toHaveLength(1);
    const q = questions[0];
    expect(q.domain).toBe("Domínio 2: Segurança e Conformidade");
    expect(q.options).toHaveLength(4);
    expect(q.correctOptionId).toBe("opt_a");
    expect(q.explanation).toContain("AWS Security Token Service");
  });
});
