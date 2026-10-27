import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { QuestionInternal } from "../src/types/exam";

const tag = `gen${Date.now()}`;
const TOPIC = "AWS Secrets Manager";

vi.mock("../src/lib/gemini", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/lib/gemini")>();
  return {
    ...original,
    isAiGenerationConfigured: () => true,
    generateQuestionsWithGemini: vi.fn(async (): Promise<QuestionInternal[]> => {
      const make = (i: number, stem: string): QuestionInternal => ({
        id: `gen_${tag}_${i}`,
        domain: "Domínio 2: Segurança e Conformidade",
        topic: TOPIC,
        stem,
        options: [
          { id: "opt_a", text: "Opção alfa plausível." },
          { id: "opt_b", text: "Opção beta plausível." },
          { id: "opt_c", text: "Opção gama plausível." },
          { id: "opt_d", text: "Opção delta plausível." },
        ],
        correctOptionId: "opt_c",
        explanation: "Explicação de teste suficientemente longa.",
      });
      const words = ["varejo", "hospital", "banco", "escola", "logística", "mídia", "governo", "jogos", "energia", "seguros",
        "turismo", "agro", "fintech", "telecom", "farmácia", "indústria", "imobiliária", "esportes", "música", "transporte"];
      const verbs = ["armazenar", "rotacionar", "auditar", "compartilhar", "revogar", "proteger", "versionar", "replicar", "monitorar", "criptografar",
        "distribuir", "isolar", "centralizar", "expirar", "recuperar", "migrar", "catalogar", "validar", "agendar", "limitar"];
      const unique = Array.from({ length: 20 }, (_, i) =>
        make(i, `[${tag}] Empresa de ${words[i]} quer ${verbs[i]} segredos ${i}`)
      );
      // duplicata exata dentro do lote
      return [...unique, make(99, unique[0].stem)];
    }),
  };
});

import { prisma } from "../src/lib/prisma";
import { selectQuestionsForUser } from "../src/lib/question-generator";
import { computeStemHash } from "../src/lib/gemini";

let userId: string;

beforeAll(async () => {
  userId = (await prisma.user.create({ data: { name: "G", email: `g.${tag}@teste.local` } })).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.question.deleteMany({ where: { stem: { contains: tag } } });
  await prisma.$disconnect();
});

describe("Geração de questões quando o banco não tem inéditas suficientes", () => {
  it("completa o simulado com questões novas, únicas, do tópico pedido e persistidas", async () => {
    const questions = await selectQuestionsForUser({
      userId,
      count: 15,
      domains: ["Domínio 2: Segurança e Conformidade"],
      subtopics: [TOPIC],
      allowSeenReuse: false,
    });
    expect(questions).toHaveLength(15);
    expect(new Set(questions.map((q) => q.id)).size).toBe(15);
    expect(new Set(questions.map((q) => computeStemHash(q.stem))).size).toBe(15);
    questions.forEach((q) => expect(q.topic).toBe(TOPIC));
    const persisted = await prisma.question.count({ where: { id: { in: questions.map((q) => q.id) } } });
    expect(persisted).toBe(15);
  });
});
