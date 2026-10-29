import { describe, expect, it } from "vitest";
import {
  getComplementarySubtopics,
  getSubtopicDistribution,
  selectBalancedByTopic,
  shuffle,
} from "../src/lib/question-generator";
import { findDomainBySubtopic } from "../src/types/subtopics";

describe("amostragem ponderada por subtópico", () => {
  it("arredonda para cima a metade selecionada em totais ímpares", () => {
    expect(getSubtopicDistribution(15)).toEqual({ selected: 8, complementary: 7 });
    expect(getSubtopicDistribution(30)).toEqual({ selected: 15, complementary: 15 });
    expect(getSubtopicDistribution(65)).toEqual({ selected: 33, complementary: 32 });
  });

  it("gera apenas complementos não selecionados do mesmo domínio-mãe", () => {
    const selected = ["Amazon GuardDuty", "Amazon Inspector"];
    const domain = findDomainBySubtopic(selected[0]);
    const complementary = getComplementarySubtopics(selected);

    expect(complementary.length).toBeGreaterThan(0);
    expect(complementary.some((topic) => selected.includes(topic))).toBe(false);
    complementary.forEach((topic) => expect(findDomainBySubtopic(topic)).toBe(domain));
  });

  it("distribui questões entre tópicos elegíveis sem reutilizar IDs excluídos", () => {
    const questions = [
      ...Array.from({ length: 5 }, (_, index) => ({ id: `guard-${index}`, topic: "Amazon GuardDuty" })),
      ...Array.from({ length: 5 }, (_, index) => ({ id: `inspect-${index}`, topic: "Amazon Inspector" })),
    ];
    const selected = selectBalancedByTopic(
      questions,
      ["Amazon GuardDuty", "Amazon Inspector"],
      6,
      new Set(["guard-0"])
    );

    expect(selected).toHaveLength(6);
    expect(new Set(selected.map((question) => question.id)).size).toBe(6);
    expect(selected.some((question) => question.id === "guard-0")).toBe(false);
    expect(selected.filter((question) => question.topic === "Amazon GuardDuty")).toHaveLength(3);
    expect(selected.filter((question) => question.topic === "Amazon Inspector")).toHaveLength(3);
  });

  it("embaralha questões sem perder nem duplicar elementos", () => {
    const questions = Array.from({ length: 30 }, (_, index) => index);
    const shuffled = shuffle(questions);

    expect(shuffled).toHaveLength(questions.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(questions);
  });
});
