import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import crypto from "crypto";
import { QuestionInternal, ExamDomain, EXAM_DOMAINS } from "../types/exam";
import { findDomainBySubtopic, getAllSubtopics } from "../types/subtopics";
import { detectAnswerLeak, isNearDuplicate, normalizeText } from "./question-quality";

// ============================================================================
// VALIDAÇÃO ESTRUTURADA (CLF-C02)
// ============================================================================

export const GeneratedOptionSchema = z.object({
  id: z.enum(["opt_a", "opt_b", "opt_c", "opt_d"]),
  text: z.string().min(3, "Texto da alternativa muito curto"),
});

/** Aceita o nome do domínio com ou sem o prefixo "Domínio N:" (o modelo às vezes omite). */
function normalizeDomain(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const target = normalizeText(value).replace(/^dominio \d+ /, "");
  return EXAM_DOMAINS.find((d) => normalizeText(d).replace(/^dominio \d+ /, "") === target) ?? value;
}

export const RawGeminiQuestionSchema = z.object({
  domain: z.preprocess(
    normalizeDomain,
    z.enum([
      "Domínio 1: Conceitos de Nuvem",
      "Domínio 2: Segurança e Conformidade",
      "Domínio 3: Tecnologia e Serviços de Nuvem",
      "Domínio 4: Faturamento, Preços e Suporte",
    ])
  ),
  subtopic: z.string().min(3, "Subtópico é obrigatório"),
  stem: z.string().min(25, "O enunciado deve ser situacional e ter pelo menos 25 caracteres"),
  options: z
    .array(GeneratedOptionSchema)
    .length(4, "Cada questão deve conter exatamente quatro alternativas (A, B, C, D)"),
  correctOptionId: z.enum(["opt_a", "opt_b", "opt_c", "opt_d"]),
  explanation: z
    .string()
    .min(25, "A explicação deve detalhar o motivo do gabarito e por que as outras são incorretas"),
  documentationUrl: z.string().optional(),
});

export const GeminiQuestionsBatchSchema = z.array(z.unknown());

export type RawGeminiQuestion = z.infer<typeof RawGeminiQuestionSchema>;

// ============================================================================
// DEDUPLICAÇÃO POR HASH NORMALIZADO
// ============================================================================

/**
 * Gera um hash SHA-256 normalizado para o enunciado da questão,
 * ignorando pontuação, acentos, maiúsculas/minúsculas e espaçamento duplo.
 */
export function computeStemHash(stem: string): string {
  const normalized = normalizeText(stem).replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function isDuplicateQuestion(newStem: string, existingHashes: Set<string>): boolean {
  return existingHashes.has(computeStemHash(newStem));
}

export function isAiGenerationConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!apiKey && apiKey.trim() !== "" && !apiKey.includes("placeholder");
}

// ============================================================================
// GERAÇÃO DE QUESTÕES NO SERVIDOR
// ============================================================================

export interface GenerateQuestionsOptions {
  count: number;
  domain?: ExamDomain;
  /** Subtópicos permitidos. Questões fora desta lista são descartadas. */
  subtopics?: string[];
  /** Hashes de enunciados já existentes (banco + histórico do usuário). */
  existingHashes?: Set<string>;
  /** Enunciados já existentes para detecção de duplicatas aproximadas. */
  existingStems?: string[];
  maxRetries?: number;
}

const OPTION_IDS = ["opt_a", "opt_b", "opt_c", "opt_d"] as const;

// Modelos tentados em ordem quando GEMINI_MODEL não está definido (fallback em caso de 404/503)
const DEFAULT_MODELS = ["gemini-3.5-flash", "gemini-flash-lite-latest"];

function buildPrompt(options: GenerateQuestionsOptions): string {
  const domainTarget = options.domain || "qualquer um dos 4 domínios oficiais";
  const subtopicsTarget =
    options.subtopics && options.subtopics.length > 0
      ? `Use SOMENTE estes subtópicos e copie o nome exatamente no campo 'subtopic': ${options.subtopics
          .map((s) => `"${s}"`)
          .join(", ")}.`
      : "Distribua de forma balanceada entre os subtópicos do exame CLF-C02.";

  const avoid = (options.existingStems ?? [])
    .slice(-40)
    .map((s) => `- ${s.slice(0, 140)}`)
    .join("\n");

  return `Você é autor sênior de questões para o exame AWS Certified Cloud Practitioner (CLF-C02).
Gere exatamente ${options.count} questões inéditas, difíceis e situacionais, baseadas em cenários reais de negócios.

REQUISITOS OBRIGATÓRIOS:
1. Idioma: português brasileiro.
2. Domínio de foco: ${domainTarget}.
3. ${subtopicsTarget}
4. Exatamente quatro alternativas com ids 'opt_a', 'opt_b', 'opt_c' e 'opt_d', e apenas UMA correta ('correctOptionId').
5. Não inclua a opção 'Não sei'.
6. A explicação deve ser didática e justificar a correta e cada incorreta.

REGRAS CONTRA PISTAS (a resposta NÃO pode ser deduzível sem conhecimento):
- Todas as alternativas devem ter tamanho, nível de detalhe e estrutura gramatical semelhantes.
- Todas as alternativas devem ser serviços, conceitos ou ações reais e plausíveis do mesmo tipo.
- O enunciado NÃO pode repetir palavras ou o nome do serviço presentes apenas na alternativa correta.
- Não use "todas as anteriores", "nenhuma das anteriores", nem termos como "correta" ou "gabarito" nas alternativas.
- Varie a posição da alternativa correta entre opt_a, opt_b, opt_c e opt_d.
- Cada questão deve abordar um cenário diferente das demais do lote.

NÃO REPITA nem reformule os cenários destas questões já existentes:
${avoid || "- (nenhuma)"}

Retorne estritamente um array JSON conforme o schema.`;
}

/**
 * Gera questões no padrão CLF-C02. Execução estritamente no servidor.
 * Descarta questões inválidas, fora dos subtópicos permitidos, duplicadas ou com pistas da resposta.
 */
export async function generateQuestionsWithGemini(
  options: GenerateQuestionsOptions
): Promise<QuestionInternal[]> {
  if (!isAiGenerationConfigured()) {
    throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  }

  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : DEFAULT_MODELS;
  const maxRetries = options.maxRetries ?? Math.max(1, models.length - 1);
  const existingHashes = new Set(options.existingHashes ?? []);
  const existingStems = [...(options.existingStems ?? [])];
  const allowedSubtopics = new Set(
    options.subtopics && options.subtopics.length > 0 ? options.subtopics : getAllSubtopics()
  );

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = buildPrompt(options);

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: models[attempt % models.length],
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                domain: { type: Type.STRING, format: "enum", enum: [...EXAM_DOMAINS] },
                subtopic: { type: Type.STRING, description: "Nome exato do subtópico" },
                stem: { type: Type.STRING, description: "Enunciado situacional" },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      text: { type: Type.STRING },
                    },
                    required: ["id", "text"],
                  },
                },
                correctOptionId: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["domain", "subtopic", "stem", "options", "correctOptionId", "explanation"],
            },
          },
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Resposta vazia do gerador de questões.");

      const batch = GeminiQuestionsBatchSchema.parse(JSON.parse(responseText));
      const processed: QuestionInternal[] = [];
      const rejected: Record<string, number> = {};
      const reject = (reason: string) => {
        rejected[reason] = (rejected[reason] ?? 0) + 1;
      };

      for (const item of batch) {
        const parsed = RawGeminiQuestionSchema.safeParse(item);
        if (!parsed.success) {
          reject(`formato: ${parsed.error.issues[0]?.path.join(".")}`);
          continue;
        }
        const raw = parsed.data;

        if (!allowedSubtopics.has(raw.subtopic)) {
          reject("subtópico fora da lista");
          continue;
        }
        const domain = findDomainBySubtopic(raw.subtopic) ?? raw.domain;
        if (!EXAM_DOMAINS.includes(domain) || new Set(raw.options.map((o) => o.id)).size !== 4) {
          reject("domínio ou alternativas inválidas");
          continue;
        }

        const options = OPTION_IDS.map((id) => raw.options.find((o) => o.id === id)!);
        const leak = detectAnswerLeak({ stem: raw.stem, options, correctOptionId: raw.correctOptionId });
        if (leak) {
          reject(leak);
          continue;
        }

        const hash = computeStemHash(raw.stem);
        if (existingHashes.has(hash) || isNearDuplicate(raw.stem, existingStems)) {
          reject("duplicada");
          continue;
        }
        existingHashes.add(hash);
        existingStems.push(raw.stem);

        processed.push({
          id: `gen_${hash.slice(0, 24)}`,
          domain,
          topic: raw.subtopic,
          stem: raw.stem,
          options: options.map((o) => ({ id: o.id, text: o.text })),
          correctOptionId: raw.correctOptionId,
          explanation: raw.explanation,
        });
      }

      if (Object.keys(rejected).length > 0) {
        console.warn("[questoes] geradas descartadas:", JSON.stringify(rejected));
      }
      return processed.slice(0, options.count);
    } catch (error) {
      lastError = error;
      attempt++;
    }
  }

  throw new Error(
    `Falha ao gerar questões após ${maxRetries + 1} tentativas: ${
      lastError instanceof Error ? lastError.message : "erro desconhecido"
    }`
  );
}
