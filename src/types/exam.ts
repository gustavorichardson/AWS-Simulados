// Tipos fundamentais da plataforma AWS Simulados (CLF-C02)

export type ExamDomain =
  | "Domínio 1: Conceitos de Nuvem"
  | "Domínio 2: Segurança e Conformidade"
  | "Domínio 3: Tecnologia e Serviços de Nuvem"
  | "Domínio 4: Faturamento, Preços e Suporte";

export const EXAM_DOMAINS: ExamDomain[] = [
  "Domínio 1: Conceitos de Nuvem",
  "Domínio 2: Segurança e Conformidade",
  "Domínio 3: Tecnologia e Serviços de Nuvem",
  "Domínio 4: Faturamento, Preços e Suporte",
];

export const VALID_QUESTION_COUNTS = [15, 30, 45, 65] as const;
export type ValidQuestionCount = (typeof VALID_QUESTION_COUNTS)[number];

export const QUESTION_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];
export type ContentOptionId = "opt_a" | "opt_b" | "opt_c" | "opt_d";
export type OptionExplanations = Record<ContentOptionId, string>;

export const DONT_KNOW_OPTION_ID = "opt_dont_know";
export const DONT_KNOW_OPTION_TEXT = "Não sei";

export interface QuestionOption {
  id: string;
  text: string;
  isDontKnow?: boolean;
}

// Visualização enviada ao navegador (SECRETA / PROTEGIDA: sem gabarito)
// Visão pública enviada durante o simulado: sem gabarito, sem explicação e sem tópico
// (o nome do tópico pode revelar o serviço/conceito da resposta correta).
export interface QuestionPublicView {
  id: string;
  domain: ExamDomain;
  stem: string;
  options: QuestionOption[];
}

export type ExamMode = "ESTUDO" | "PROVA";
export const EXAM_MODES: ExamMode[] = ["ESTUDO", "PROVA"];

export interface StudyFeedback {
  isCorrect: boolean;
  correctOptionId: string;
  optionExplanations: OptionExplanations;
}

export interface TopicPerformance {
  topic: string;
  domain: ExamDomain;
  total: number;
  correct: number;
  incorrect: number;
  dontKnow: number;
  unanswered: number;
  percentage: number;
}

// Representação completa armazenada no servidor ou banco de dados
export interface QuestionInternal {
  id: string;
  domain: ExamDomain;
  topic: string;
  stem: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  correctOptionId: string;
  explanation: string;
  difficulty?: QuestionDifficulty;
  optionExplanations?: OptionExplanations;
  documentationUrl?: string;
}

export type AnswerStatus = "CORRETA" | "ERRADA" | "NAO_SEI" | "NAO_RESPONDIDA";
export type StudyFeedbackCategory = "ERRADA" | "REPETIDA" | "DIFICULDADE_INCORRETA";
export type DifficultyDirection = "MAIS_FACIL" | "MAIS_DIFICIL";
export type StudyQuestionFeedbackState = Partial<
  Record<StudyFeedbackCategory, true | DifficultyDirection>
>;

export interface UnknownOptionSelection {
  questionId: string;
  topic: string;
  domain: ExamDomain;
  optionId: string;
  optionText: string;
}

export interface UserSubmission {
  questionId: string;
  selectedOptionId?: string | null;
}

export interface EvaluatedAnswer {
  questionId: string;
  domain: ExamDomain;
  topic: string;
  stem: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  status: AnswerStatus;
  explanation: string;
  options: QuestionOption[];
}

export interface ExamEvaluationResult {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  dontKnowCount: number;
  unansweredCount: number;
  percentageScore: number;
  estimatedScaledScore: number; // Escala 100 - 1000 da AWS
  isPassed: boolean; // Nota de corte: >= 700
  domainBreakdown: Record<
    ExamDomain,
    {
      total: number;
      correct: number;
      incorrect: number;
      dontKnow: number;
      unanswered: number;
    }
  >;
  topicBreakdown: TopicPerformance[];
  recoveryTopics: string[]; // Tópicos onde houve erro ou marcação de "Não sei"
  detailedAnswers: EvaluatedAnswer[];
}

// Resultado enviado ao cliente após a finalização.
// No Modo Prova, detailedAnswers é omitido (sem gabarito e sem explicações).
export interface ExamResultView extends Omit<ExamEvaluationResult, "detailedAnswers"> {
  attemptId: string;
  mode: ExamMode;
  isRecovery: boolean;
  finishedAt: string | null;
  detailedAnswers?: EvaluatedAnswer[];
  unknownOptions?: UnknownOptionSelection[];
}

export interface ExamConfig {
  questionCount: ValidQuestionCount;
  selectedDomains: ExamDomain[];
}
