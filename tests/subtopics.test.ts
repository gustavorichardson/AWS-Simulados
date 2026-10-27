import { describe, it, expect } from "vitest";
import {
  createInitialSelection,
  selectAllTopicsExclusive,
  toggleDomainSelection,
  toggleSubtopicSelection,
} from "../src/lib/topic-selection";
import {
  DOMAIN_HIERARCHIES,
  getAllSubtopics,
  findDomainBySubtopic,
} from "../src/types/subtopics";

describe("Hierarquia de Subtópicos e Menus Suspensos", () => {
  it("deve conter a lista oficial de subtópicos distribuída nos 4 domínios", () => {
    expect(DOMAIN_HIERARCHIES).toHaveLength(4);
    const allSubs = getAllSubtopics();
    expect(allSubs.length).toBeGreaterThan(20);

    // Verifica que cada domínio possui pelo menos 5 subtópicos
    DOMAIN_HIERARCHIES.forEach((h) => {
      expect(h.subtopics.length).toBeGreaterThanOrEqual(5);
    });
  });

  it("deve resolver o domínio correto a partir de um subtópico", () => {
    expect(findDomainBySubtopic("Modelo de Responsabilidade Compartilhada")).toBe(
      "Domínio 1: Conceitos de Nuvem"
    );
    expect(findDomainBySubtopic("AWS IAM e Princípio do Menor Privilégio")).toBe(
      "Domínio 2: Segurança e Conformidade"
    );
    expect(findDomainBySubtopic("Amazon S3 e Armazenamento de Objetos")).toBe(
      "Domínio 3: Tecnologia e Serviços de Nuvem"
    );
    expect(findDomainBySubtopic("AWS Budgets vs AWS Cost Explorer")).toBe(
      "Domínio 4: Faturamento, Preços e Suporte"
    );
  });

  it("deve desmarcar 'Todos os tópicos' ao selecionar um subtópico específico dentro de um menu suspenso", () => {
    const initial = createInitialSelection();
    expect(initial.isAllSelected).toBe(true);

    // Clica no subtópico "Modelo de Responsabilidade Compartilhada" dentro do Domínio 1
    const updated = toggleSubtopicSelection(
      initial,
      "Domínio 1: Conceitos de Nuvem",
      "Modelo de Responsabilidade Compartilhada"
    );

    expect(updated.isAllSelected).toBe(false);
    expect(updated.selectedSubtopics).toEqual([
      "Modelo de Responsabilidade Compartilhada",
    ]);
    expect(updated.selectedDomains).toContain("Domínio 1: Conceitos de Nuvem");
    expect(updated.selectedDomains).not.toContain("Domínio 2: Segurança e Conformidade");
  });

  it("deve permitir seleção múltipla granular entre subtópicos de domínios diferentes", () => {
    let state = selectAllTopicsExclusive();

    // Seleciona subtópico do Domínio 1
    state = toggleSubtopicSelection(
      state,
      "Domínio 1: Conceitos de Nuvem",
      "Elasticidade e Escalabilidade"
    );

    // Seleciona subtópico do Domínio 2
    state = toggleSubtopicSelection(
      state,
      "Domínio 2: Segurança e Conformidade",
      "AWS KMS e Criptografia"
    );

    expect(state.isAllSelected).toBe(false);
    expect(state.selectedSubtopics).toContain("Elasticidade e Escalabilidade");
    expect(state.selectedSubtopics).toContain("AWS KMS e Criptografia");
    expect(state.selectedDomains).toContain("Domínio 1: Conceitos de Nuvem");
    expect(state.selectedDomains).toContain("Domínio 2: Segurança e Conformidade");
    expect(state.selectedDomains).not.toContain("Domínio 3: Tecnologia e Serviços de Nuvem");
  });

  it("deve selecionar todos os subtópicos ao marcar um domínio inteiro", () => {
    const initial = selectAllTopicsExclusive();

    // Alterna o Domínio 3
    const updated = toggleDomainSelection(
      initial,
      "Domínio 3: Tecnologia e Serviços de Nuvem"
    );

    expect(updated.isAllSelected).toBe(false);
    expect(updated.selectedDomains).toEqual([
      "Domínio 3: Tecnologia e Serviços de Nuvem",
    ]);
    expect(updated.selectedSubtopics).toContain("Amazon S3 e Armazenamento de Objetos");
    expect(updated.selectedSubtopics).toContain("Computação Serverless (AWS Lambda)");
    expect(updated.selectedSubtopics).not.toContain("Elasticidade e Escalabilidade");
  });
});
