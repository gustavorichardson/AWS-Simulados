import { describe, it, expect, vi } from "vitest";
import {
  RawGeminiQuestionSchema,
  computeStemHash,
  hasHardAnswerContext,
  matchesDifficultyShape,
  buildQuestionPrompt,
  isDuplicateQuestion,
  generateQuestionsWithGemini,
} from "../src/lib/gemini";

// Mock da SDK do Google GenAI para evitar chamadas de rede nos testes automatizados
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
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
              optionExplanations: {
                opt_a: "IAM Roles com STS emitem credenciais temporárias federadas, conforme solicitado.",
                opt_b: "Chaves permanentes não expiram automaticamente e não atendem ao requisito.",
                opt_c: "Políticas do S3 não fornecem credenciais temporárias para instâncias EC2.",
                opt_d: "Grupos de segurança controlam tráfego de rede, não identidade federada.",
              },
            },
          ]),
        }),
      };
    },
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
    optionExplanations: {
      opt_a: "Elasticidade ajusta recursos automaticamente conforme a demanda varia.",
      opt_b: "Confiabilidade não é o conceito de provisionamento automático sob demanda.",
      opt_c: "CapEx descreve investimento inicial, não ajuste de capacidade.",
      opt_d: "Latência fixa não representa mudança automática de capacidade.",
    },
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

  it("reconhece contexto explicativo em alternativas difíceis e aceita nomes crus", () => {
    expect(hasHardAnswerContext("Amazon S3")).toBe(false);
    expect(hasHardAnswerContext("AWS Identity and Access Management")).toBe(false);
    expect(hasHardAnswerContext("Amazon S3, serviço de armazenamento de objetos")).toBe(true);
    expect(hasHardAnswerContext("Amazon S3 permite armazenar objetos")).toBe(true);
  });

  it("mantém qualquer nível de geração dentro do escopo de dificuldade CLF-C02", () => {
    const easyPrompt = buildQuestionPrompt({ count: 1, difficulty: "EASY" });
    const hardPrompt = buildQuestionPrompt({ count: 1, difficulty: "HARD" });

    expect(easyPrompt).toContain("REGRA DE ESCOPO INEGOCIÁVEL");
    expect(easyPrompt).toContain("NUNCA ultrapasse esse nível");
    expect(easyPrompt).toContain("enunciado intuitivo de 6 a 35 palavras");
    expect(hardPrompt).toContain("cenário realista de arquitetura");
    expect(hardPrompt).toContain("tecnicamente próximas");
  });

  it("aplica estruturas diferentes às dificuldades e rejeita contexto nas alternativas médias/difíceis", () => {
    const shortStem = "Qual serviço gerencia permissões e credenciais na AWS?";
    const easyOptions = [
      { text: "AWS IAM — controla identidades e permissões." },
      { text: "AWS CloudTrail — registra atividades da conta." },
      { text: "AWS KMS — gerencia chaves de criptografia." },
      { text: "Amazon S3 — armazena objetos." },
    ];
    const mediumStem =
      "Uma empresa precisa organizar permissões temporárias para workloads de várias contas e evitar credenciais permanentes. Qual serviço ou recurso atende a esse requisito com menor privilégio?";
    const hardStem =
      "Uma organização com múltiplas unidades precisa permitir que aplicações hospedadas em contas distintas obtenham acesso temporário a recursos compartilhados. O desenho deve evitar credenciais permanentes, permitir auditoria centralizada e reduzir o acoplamento entre as equipes operacionais de segurança. Qual recurso atende melhor a esse conjunto de requisitos?";
    const directOptions = [
      { text: "AWS IAM" },
      { text: "AWS CloudTrail" },
      { text: "AWS Organizations" },
      { text: "AWS KMS" },
    ];

    expect(matchesDifficultyShape(shortStem, easyOptions, "EASY")).toBe(true);
    expect(matchesDifficultyShape("Qual recurso concede permissões temporárias?", easyOptions, "EASY")).toBe(false);
    expect(
      matchesDifficultyShape(
        `${shortStem} ${"Com uma organização que precisa manter controles consistentes em várias contas.".repeat(3)}`,
        easyOptions,
        "EASY"
      )
    ).toBe(false);
    expect(matchesDifficultyShape(mediumStem, directOptions, "MEDIUM")).toBe(true);
    expect(
      matchesDifficultyShape(mediumStem, [{ text: "AWS IAM fornece permissões temporárias." }, ...directOptions.slice(1)], "MEDIUM")
    ).toBe(false);
    expect(matchesDifficultyShape(hardStem, directOptions, "HARD")).toBe(true);
    expect(matchesDifficultyShape(shortStem, directOptions, "HARD")).toBe(false);
    expect(matchesDifficultyShape(mediumStem, directOptions, "HARD")).toBe(false);
    expect(matchesDifficultyShape(hardStem, [...directOptions.slice(1), { text: "AWS IAM fornece permissões." }], "HARD")).toBe(false);
    expect(matchesDifficultyShape(shortStem, directOptions.slice(0, 3), "EASY")).toBe(false);
  });

  it("inclui sinais de feedback nos prompts sem afirmar treinamento automático", () => {
    const prompt = buildQuestionPrompt({
      count: 1,
      difficulty: "MEDIUM",
      feedbackSignals: [
        {
          category: "DIFICULDADE_INCORRETA",
          difficulty: "MEDIUM",
          direction: "MAIS_FACIL",
          topic: "Amazon S3",
        },
      ],
    });
    expect(prompt).toContain("estava fácil demais");
    expect(prompt).toContain("não altera nem treina automaticamente o modelo");
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
      difficulty: "MEDIUM",
      domain: "Domínio 2: Segurança e Conformidade",
    });

    expect(questions).toHaveLength(1);
    const q = questions[0];
    expect(q.domain).toBe("Domínio 2: Segurança e Conformidade");
    expect(q.options).toHaveLength(4);
    expect(q.correctOptionId).toBe("opt_a");
    expect(q.explanation).toContain("AWS Security Token Service");
    expect(q.difficulty).toBe("MEDIUM");
    expect(q.optionExplanations?.opt_a).toContain("credenciais temporárias");
  });
});
