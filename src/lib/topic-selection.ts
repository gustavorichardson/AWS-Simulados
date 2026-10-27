// Lógica pura de seleção de tópicos do simulado AWS CLF-C02
import { EXAM_DOMAINS, ExamDomain } from "../types/exam";

export const ALL_DOMAINS_KEY = "TODOS";
export const ALL_DOMAINS_LABEL = "Todos os tópicos do exame";

/**
 * Aplica a regra de exclusividade:
 * - Se o usuário clicar em "Todos os tópicos", ele se torna exclusivo (limpa tópicos individuais).
 * - Se o usuário clicar em um tópico específico, "Todos os tópicos" é desmarcado automaticamente.
 */
export function toggleTopicSelection(
  currentSelected: string[],
  clickedTopic: string
): string[] {
  if (clickedTopic === ALL_DOMAINS_KEY) {
    // Se "TODOS" já estiver selecionado sozinho, não faz nada ou mantém
    return [ALL_DOMAINS_KEY];
  }

  // Remove "TODOS" da lista
  const withoutAll = currentSelected.filter((t) => t !== ALL_DOMAINS_KEY);

  if (withoutAll.includes(clickedTopic)) {
    const remaining = withoutAll.filter((t) => t !== clickedTopic);
    // Se desmarcou todos os individuais, volta para "TODOS" por conveniência
    return remaining.length === 0 ? [ALL_DOMAINS_KEY] : remaining;
  } else {
    return [...withoutAll, clickedTopic];
  }
}

/**
 * Converte a seleção de tópicos em lista de ExamDomain para filtragem
 */
export function resolveSelectedDomains(selectedTopics: string[]): ExamDomain[] {
  if (selectedTopics.includes(ALL_DOMAINS_KEY) || selectedTopics.length === 0) {
    return [...EXAM_DOMAINS];
  }
  return selectedTopics.filter((t): t is ExamDomain =>
    EXAM_DOMAINS.includes(t as ExamDomain)
  );
}
