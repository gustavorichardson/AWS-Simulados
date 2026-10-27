// Motor de avaliação, sanitização e diagnósticos do simulado AWS CLF-C02
import {
  QuestionInternal,
  QuestionPublicView,
  QuestionOption,
  UserSubmission,
  ExamEvaluationResult,
  EvaluatedAnswer,
  AnswerStatus,
  ExamDomain,
  EXAM_DOMAINS,
  DONT_KNOW_OPTION_ID,
  DONT_KNOW_OPTION_TEXT,
  VALID_QUESTION_COUNTS,
  ValidQuestionCount,
} from "../types/exam";

/**
 * Valida se a quantidade de questões solicitada é uma das opções oficiais da plataforma
 */
export function isValidQuestionCount(count: number): count is ValidQuestionCount {
  return VALID_QUESTION_COUNTS.includes(count as ValidQuestionCount);
}

/**
 * Sanitiza a questão para exibição no frontend durante o simulado.
 * Regras críticas:
 * 1. NUNCA envia correctOptionId ou explanation para o cliente.
 * 2. Garante 4 alternativas normais + a 5ª opção fixa e idêntica: "Não sei".
 */
export function sanitizeQuestion(question: QuestionInternal): QuestionPublicView {
  // Converte as opções originais e adiciona a 5ª opção "Não sei"
  const formattedOptions: QuestionOption[] = question.options.map((opt) => ({
    id: opt.id,
    text: opt.text,
    isDontKnow: false,
  }));

  // Adiciona a quinta opção obrigatória
  formattedOptions.push({
    id: DONT_KNOW_OPTION_ID,
    text: DONT_KNOW_OPTION_TEXT,
    isDontKnow: true,
  });

  return {
    id: question.id,
    domain: question.domain,
    topic: question.topic,
    stem: question.stem,
    options: formattedOptions,
  };
}

/**
 * Sanitiza uma lista completa de questões
 */
export function sanitizeQuestions(questions: QuestionInternal[]): QuestionPublicView[] {
  return questions.map(sanitizeQuestion);
}

/**
 * Avalia as respostas submetidas pelo estudante contra as questões internas do servidor.
 * Classifica em: CORRETA, ERRADA, NAO_SEI ou NAO_RESPONDIDA.
 */
export function evaluateExam(
  submissions: UserSubmission[],
  questions: QuestionInternal[]
): ExamEvaluationResult {
  const submissionMap = new Map<string, string | null>();
  submissions.forEach((sub) => {
    submissionMap.set(sub.questionId, sub.selectedOptionId ?? null);
  });

  let correctCount = 0;
  let incorrectCount = 0;
  let dontKnowCount = 0;
  let unansweredCount = 0;

  const recoveryTopicsSet = new Set<string>();

  // Inicializa a distribuição por domínios
  const domainBreakdown = EXAM_DOMAINS.reduce((acc, domain) => {
    acc[domain] = {
      total: 0,
      correct: 0,
      incorrect: 0,
      dontKnow: 0,
      unanswered: 0,
    };
    return acc;
  }, {} as ExamEvaluationResult["domainBreakdown"]);

  const detailedAnswers: EvaluatedAnswer[] = questions.map((q) => {
    const selected = submissionMap.get(q.id) ?? null;
    let status: AnswerStatus;

    if (!selected) {
      status = "NAO_RESPONDIDA";
      unansweredCount++;
    } else if (selected === DONT_KNOW_OPTION_ID) {
      status = "NAO_SEI";
      dontKnowCount++;
      recoveryTopicsSet.add(q.topic);
    } else if (selected === q.correctOptionId) {
      status = "CORRETA";
      correctCount++;
    } else {
      status = "ERRADA";
      incorrectCount++;
      recoveryTopicsSet.add(q.topic);
    }

    // Registra métricas por domínio
    if (domainBreakdown[q.domain]) {
      domainBreakdown[q.domain].total++;
      if (status === "CORRETA") domainBreakdown[q.domain].correct++;
      if (status === "ERRADA") domainBreakdown[q.domain].incorrect++;
      if (status === "NAO_SEI") domainBreakdown[q.domain].dontKnow++;
      if (status === "NAO_RESPONDIDA") domainBreakdown[q.domain].unanswered++;
    }

    // Prepara as opções completas para a revisão pós-exame
    const reviewOptions: QuestionOption[] = [
      ...q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        isDontKnow: false,
      })),
      {
        id: DONT_KNOW_OPTION_ID,
        text: DONT_KNOW_OPTION_TEXT,
        isDontKnow: true,
      },
    ];

    return {
      questionId: q.id,
      domain: q.domain,
      topic: q.topic,
      stem: q.stem,
      selectedOptionId: selected,
      correctOptionId: q.correctOptionId,
      status,
      explanation: q.explanation,
      options: reviewOptions,
    };
  });

  const totalQuestions = questions.length;
  const percentageScore =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Escala oficial da AWS: pontuação varia de 100 a 1000, com nota de corte em 700
  const estimatedScaledScore =
    totalQuestions > 0 ? Math.round(100 + (correctCount / totalQuestions) * 900) : 100;

  const isPassed = estimatedScaledScore >= 700;

  return {
    totalQuestions,
    correctCount,
    incorrectCount,
    dontKnowCount,
    unansweredCount,
    percentageScore,
    estimatedScaledScore,
    isPassed,
    domainBreakdown,
    recoveryTopics: Array.from(recoveryTopicsSet),
    detailedAnswers,
  };
}
