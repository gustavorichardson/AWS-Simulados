// Lógica pura de seleção de tópicos e subtópicos do simulado AWS CLF-C02
import { EXAM_DOMAINS, ExamDomain } from "../types/exam";
import { DOMAIN_HIERARCHIES, getAllSubtopics } from "../types/subtopics";

export const ALL_DOMAINS_KEY = "TODOS";
export const ALL_DOMAINS_LABEL = "Todos os tópicos do exame";

export interface SelectionState {
  isAllSelected: boolean;
  selectedDomains: ExamDomain[];
  selectedSubtopics: string[];
}

export function createInitialSelection(): SelectionState {
  return {
    isAllSelected: true,
    selectedDomains: [...EXAM_DOMAINS],
    selectedSubtopics: getAllSubtopics(),
  };
}

/**
 * Seleciona "Todos os tópicos" de forma exclusiva
 */
export function selectAllTopicsExclusive(): SelectionState {
  return createInitialSelection();
}

/**
 * Alterna um domínio completo (marca/desmarca todos os seus subtópicos)
 */
export function toggleDomainSelection(
  current: SelectionState,
  domain: ExamDomain
): SelectionState {
  const hierarchy = DOMAIN_HIERARCHIES.find((h) => h.domain === domain);
  if (!hierarchy) return current;

  // Se "TODOS" estava ativo, agora desmarca TODOS e foca no domínio selecionado
  if (current.isAllSelected) {
    return {
      isAllSelected: false,
      selectedDomains: [domain],
      selectedSubtopics: [...hierarchy.subtopics],
    };
  }

  const isDomainSelected = current.selectedDomains.includes(domain);

  if (isDomainSelected) {
    // Desmarca o domínio e seus subtópicos
    const nextDomains = current.selectedDomains.filter((d) => d !== domain);
    const nextSubtopics = current.selectedSubtopics.filter(
      (s) => !hierarchy.subtopics.includes(s)
    );

    if (nextDomains.length === 0 && nextSubtopics.length === 0) {
      // Se não sobrou nada, volta para TODOS por conveniência
      return selectAllTopicsExclusive();
    }

    return {
      isAllSelected: false,
      selectedDomains: nextDomains,
      selectedSubtopics: nextSubtopics,
    };
  } else {
    // Marca o domínio e adiciona todos os seus subtópicos
    const nextDomains = [...current.selectedDomains, domain];
    const nextSubtopics = Array.from(
      new Set([...current.selectedSubtopics, ...hierarchy.subtopics])
    );

    // Se todos os domínios foram marcados, volta para TODOS
    if (nextDomains.length === EXAM_DOMAINS.length) {
      return selectAllTopicsExclusive();
    }

    return {
      isAllSelected: false,
      selectedDomains: nextDomains,
      selectedSubtopics: nextSubtopics,
    };
  }
}

/**
 * Alterna um subtópico específico dentro de um domínio (com menu suspenso)
 */
export function toggleSubtopicSelection(
  current: SelectionState,
  domain: ExamDomain,
  subtopic: string
): SelectionState {
  const hierarchy = DOMAIN_HIERARCHIES.find((h) => h.domain === domain);
  if (!hierarchy) return current;

  let activeSubtopics: string[];

  // Se TODOS estava ativo, a seleção foca exclusivamente no subtópico clicado
  if (current.isAllSelected) {
    activeSubtopics = [subtopic];
  } else {
    if (current.selectedSubtopics.includes(subtopic)) {
      activeSubtopics = current.selectedSubtopics.filter((s) => s !== subtopic);
    } else {
      activeSubtopics = [...current.selectedSubtopics, subtopic];
    }
  }

  // Recalcula quais domínios estão completos
  const nextDomains: ExamDomain[] = [];
  for (const h of DOMAIN_HIERARCHIES) {
    const hasAny = h.subtopics.some((s) => activeSubtopics.includes(s));
    if (hasAny) {
      nextDomains.push(h.domain);
    }
  }

  if (activeSubtopics.length === 0) {
    return selectAllTopicsExclusive();
  }

  if (activeSubtopics.length === getAllSubtopics().length) {
    return selectAllTopicsExclusive();
  }

  return {
    isAllSelected: false,
    selectedDomains: nextDomains,
    selectedSubtopics: activeSubtopics,
  };
}

/**
 * Converte estado legado de string[] para SelectionState
 */
export function parseLegacyTopics(topics: string[]): SelectionState {
  if (topics.includes(ALL_DOMAINS_KEY) || topics.length === 0) {
    return createInitialSelection();
  }

  const selectedDomains = topics.filter((t): t is ExamDomain =>
    EXAM_DOMAINS.includes(t as ExamDomain)
  );

  const selectedSubtopics = DOMAIN_HIERARCHIES.filter((dh) =>
    selectedDomains.includes(dh.domain)
  ).flatMap((dh) => dh.subtopics);

  return {
    isAllSelected: false,
    selectedDomains,
    selectedSubtopics,
  };
}

/**
 * Legado: compatibilidade com testes anteriores
 */
export function toggleTopicSelection(
  currentSelected: string[],
  clickedTopic: string
): string[] {
  if (clickedTopic === ALL_DOMAINS_KEY) {
    return [ALL_DOMAINS_KEY];
  }

  const withoutAll = currentSelected.filter((t) => t !== ALL_DOMAINS_KEY);

  if (withoutAll.includes(clickedTopic)) {
    const remaining = withoutAll.filter((t) => t !== clickedTopic);
    return remaining.length === 0 ? [ALL_DOMAINS_KEY] : remaining;
  } else {
    return [...withoutAll, clickedTopic];
  }
}

export function resolveSelectedDomains(selectedTopics: string[]): ExamDomain[] {
  if (selectedTopics.includes(ALL_DOMAINS_KEY) || selectedTopics.length === 0) {
    return [...EXAM_DOMAINS];
  }
  return selectedTopics.filter((t): t is ExamDomain =>
    EXAM_DOMAINS.includes(t as ExamDomain)
  );
}
