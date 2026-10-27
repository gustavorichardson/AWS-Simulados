import { describe, it, expect } from "vitest";
import {
  ALL_DOMAINS_KEY,
  toggleTopicSelection,
  resolveSelectedDomains,
} from "../src/lib/topic-selection";
import { EXAM_DOMAINS } from "../src/types/exam";

describe("Regra de Negócio: Exclusividade da Opção 'Todos os tópicos'", () => {
  it("deve selecionar 'TODOS' de forma exclusiva e remover seleções individuais", () => {
    // Cenário: o estudante tinha selecionado Domínio 1 e Domínio 2
    const current = ["Domínio 1: Conceitos de Nuvem", "Domínio 2: Segurança e Conformidade"];

    // Clica em 'TODOS'
    const updated = toggleTopicSelection(current, ALL_DOMAINS_KEY);

    // Deve conter apenas 'TODOS'
    expect(updated).toEqual([ALL_DOMAINS_KEY]);
    expect(updated).toHaveLength(1);
  });

  it("deve desmarcar 'TODOS' automaticamente ao selecionar um tópico individual", () => {
    // Cenário: 'TODOS' estava selecionado
    const current = [ALL_DOMAINS_KEY];

    // Clica no Domínio 3
    const updated = toggleTopicSelection(current, "Domínio 3: Tecnologia e Serviços de Nuvem");

    // Deve conter apenas o Domínio 3, e NÃO conter 'TODOS'
    expect(updated).not.toContain(ALL_DOMAINS_KEY);
    expect(updated).toEqual(["Domínio 3: Tecnologia e Serviços de Nuvem"]);
  });

  it("deve permitir seleção múltipla entre tópicos individuais", () => {
    const step1 = toggleTopicSelection([ALL_DOMAINS_KEY], "Domínio 1: Conceitos de Nuvem");
    expect(step1).toEqual(["Domínio 1: Conceitos de Nuvem"]);

    const step2 = toggleTopicSelection(step1, "Domínio 4: Faturamento, Preços e Suporte");
    expect(step2).toContain("Domínio 1: Conceitos de Nuvem");
    expect(step2).toContain("Domínio 4: Faturamento, Preços e Suporte");
    expect(step2).not.toContain(ALL_DOMAINS_KEY);
  });

  it("deve retornar 'TODOS' caso o estudante desmarque o último tópico individual ativo", () => {
    const current = ["Domínio 1: Conceitos de Nuvem"];
    const updated = toggleTopicSelection(current, "Domínio 1: Conceitos de Nuvem");

    expect(updated).toEqual([ALL_DOMAINS_KEY]);
  });

  it("deve resolver os domínios para todos os 4 domínios oficiais quando 'TODOS' estiver selecionado", () => {
    const resolved = resolveSelectedDomains([ALL_DOMAINS_KEY]);
    expect(resolved).toEqual(EXAM_DOMAINS);
    expect(resolved).toHaveLength(4);
  });
});
