import { describe, it, expect } from "vitest";
import { detectAnswerLeak, isNearDuplicate, stemSimilarity } from "../src/lib/question-quality";

const base = {
  stem: "Uma startup precisa armazenar logs de auditoria por sete anos com o menor custo possível. Qual opção atende?",
  options: [
    { id: "opt_a", text: "Amazon S3 Glacier Deep Archive." },
    { id: "opt_b", text: "Amazon EBS com volumes gp3." },
    { id: "opt_c", text: "Amazon EFS Standard." },
    { id: "opt_d", text: "Amazon ElastiCache Redis." },
  ],
  correctOptionId: "opt_a",
};

describe("Controle de qualidade contra pistas da resposta", () => {
  it("aceita uma questão equilibrada", () => {
    expect(detectAnswerLeak(base)).toBeNull();
  });

  it("rejeita alternativa correta muito mais longa que as demais", () => {
    const q = { ...base, options: base.options.map((o) => o.id === "opt_a" ? { ...o, text: "Amazon S3 Glacier Deep Archive com políticas de ciclo de vida e retenção de longo prazo a custo mínimo." } : o) };
    expect(detectAnswerLeak(q)).toMatch(/mais longa/);
  });

  it("rejeita enunciado que repete termos exclusivos da correta", () => {
    const q = { ...base, stem: "Qual serviço oferece arquivamento Glacier Deep Archive para logs de auditoria de longo prazo?" };
    expect(detectAnswerLeak(q)).not.toBeNull();
  });

  it("rejeita 'todas as anteriores', alternativas repetidas e gabarito inexistente", () => {
    expect(detectAnswerLeak({ ...base, options: [...base.options.slice(0, 3), { id: "opt_d", text: "Todas as anteriores." }] })).not.toBeNull();
    expect(detectAnswerLeak({ ...base, options: [...base.options.slice(0, 3), { id: "opt_d", text: "Amazon EFS Standard." }] })).not.toBeNull();
    expect(detectAnswerLeak({ ...base, correctOptionId: "opt_x" })).not.toBeNull();
  });

  it("detecta duplicatas aproximadas de enunciados", () => {
    const a = "Uma empresa quer reduzir custos de armazenamento de logs de auditoria mantidos por sete anos.";
    const b = "Uma empresa deseja reduzir custos de armazenamento dos logs de auditoria mantidos durante sete anos.";
    expect(stemSimilarity(a, b)).toBeGreaterThan(0.6);
    expect(isNearDuplicate(b, [a])).toBe(true);
    expect(isNearDuplicate("Qual plano de suporte oferece um TAM designado?", [a])).toBe(false);
  });
});
