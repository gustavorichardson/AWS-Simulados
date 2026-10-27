import { QuestionInternal, ValidQuestionCount } from "../types/exam";
import { MOCK_QUESTIONS } from "../data/mockQuestions";
import { resolveSelectedDomains } from "./topic-selection";

/**
 * Gerador local determinístico de questões para o simulado AWS CLF-C02.
 *
 * NOTA DE CONFORMIDADE:
 * Este gerador utiliza exclusivamente o dataset estático e curado de 65+ questões
 * locais. NÃO realiza nenhuma chamada a APIs externas nem utiliza inteligência artificial.
 */
export function generateExamQuestionsLocally(params: {
  count: ValidQuestionCount;
  selectedTopics: string[];
}): QuestionInternal[] {
  const allowedDomains = resolveSelectedDomains(params.selectedTopics);

  // 1. Filtra as questões do repositório local pelos domínios selecionados
  const eligibleQuestions = MOCK_QUESTIONS.filter((q) =>
    allowedDomains.includes(q.domain)
  );

  if (eligibleQuestions.length === 0) {
    throw new Error("Nenhuma questão encontrada para os domínios selecionados.");
  }

  // 2. Embaralha para variedade na tentativa
  const shuffled = [...eligibleQuestions].sort(() => 0.5 - Math.random());

  // 3. Monta a lista com a quantidade solicitada (15, 30, 45 ou 65)
  const result: QuestionInternal[] = [];
  for (let i = 0; i < params.count; i++) {
    const baseQuestion = shuffled[i % shuffled.length];
    // Garante identificador único para esta instância da questão no simulado
    result.push({
      ...baseQuestion,
      id: `${baseQuestion.id}__attempt_inst_${i + 1}`,
      // Valida integridade: exatamente 4 alternativas no objeto de conteúdo
      options: baseQuestion.options.slice(0, 4),
    });
  }

  return result;
}

/**
 * Busca uma questão original pelo ID da instância (removendo o sufixo de tentativa)
 */
export function findOriginalQuestion(instanceId: string): QuestionInternal | undefined {
  const baseId = instanceId.split("__attempt_inst_")[0];
  return MOCK_QUESTIONS.find((q) => q.id === baseId);
}
