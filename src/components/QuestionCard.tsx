import React, { useState } from "react";
import {
  QuestionPublicView,
  DONT_KNOW_OPTION_ID,
  ExamMode,
  QuestionDifficulty,
  StudyFeedback,
  StudyQuestionFeedbackState,
  StudyFeedbackCategory,
  DifficultyDirection,
} from "../types/exam";
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Bookmark,
  LayoutGrid,
  AlertTriangle,
  Flame,
  Award,
} from "lucide-react";

interface QuestionCardProps {
  question: QuestionPublicView;
  currentIndex: number;
  totalQuestions: number;
  allQuestions: QuestionPublicView[];
  answers: Record<string, string>;
  studyFeedback: Record<string, StudyFeedback>;
  unknownOptions: Record<string, string[]>;
  questionFeedback: Record<string, StudyQuestionFeedbackState>;
  isConfirmingAnswer: boolean;
  markedForReview: Record<string, boolean>;
  onSelectOption: (optionId: string) => void;
  onConfirmStudyAnswer: () => void;
  onToggleUnknownOption: (questionId: string, optionId: string) => void;
  onQuestionFeedback: (
    questionId: string,
    category: StudyFeedbackCategory,
    active: boolean,
    difficultyDirection?: DifficultyDirection
  ) => void;
  onToggleReview: (questionId: string) => void;
  onJumpToQuestion: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  isSubmitting?: boolean;
  mode: ExamMode;
  difficulty: QuestionDifficulty;
}

function getOptionExplanation(
  feedback: StudyFeedback,
  optionId: string
): string | undefined {
  switch (optionId) {
    case "opt_a":
      return feedback.optionExplanations.opt_a;
    case "opt_b":
      return feedback.optionExplanations.opt_b;
    case "opt_c":
      return feedback.optionExplanations.opt_c;
    case "opt_d":
      return feedback.optionExplanations.opt_d;
    default:
      return undefined;
  }
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentIndex,
  totalQuestions,
  allQuestions,
  answers,
  studyFeedback,
  unknownOptions,
  questionFeedback,
  isConfirmingAnswer,
  markedForReview,
  onSelectOption,
  onConfirmStudyAnswer,
  onToggleUnknownOption,
  onQuestionFeedback,
  onToggleReview,
  onJumpToQuestion,
  onPrevious,
  onNext,
  onFinish,
  isSubmitting = false,
  mode,
  difficulty,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showGridDrawer, setShowGridDrawer] = useState(false);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const selectedOptionId = answers[question.id] ?? null;
  const feedback = studyFeedback[question.id];
  const isStudyConfirmed = mode === "ESTUDO" && !!feedback;
  const isMarked = !!markedForReview[question.id];
  const unknownOptionIds = unknownOptions[question.id] ?? [];
  const reportedFeedback = questionFeedback[question.id] ?? {};

  const answeredCount = mode === "ESTUDO" ? Object.keys(studyFeedback).length : Object.keys(answers).length;
  const reviewedCount = Object.values(markedForReview).filter(Boolean).length;
  const unansweredCount = totalQuestions - answeredCount;

  const optionLetters = ["A", "B", "C", "D"];
  const difficultyLabels: Record<QuestionDifficulty, string> = {
    EASY: "Fácil",
    MEDIUM: "Médio",
    HARD: "Difícil",
  };
  const difficultyStyles: Record<QuestionDifficulty, string> = {
    EASY: "bg-emerald-50 border-emerald-200 text-emerald-700",
    MEDIUM: "bg-amber-50 border-amber-200 text-amber-800",
    HARD: "bg-rose-50 border-rose-200 text-rose-700",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Barra de Status Superior do Exame */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold">
            <Award className="w-3.5 h-3.5" />
            AWS CLF-C02
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold ${difficultyStyles[difficulty]}`}>
            <Flame className="w-3.5 h-3.5" />
            {difficultyLabels[difficulty]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Marcar para Revisão */}
          <button
            type="button"
            onClick={() => onToggleReview(question.id)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isMarked
                ? "bg-purple-100 border-purple-300 text-purple-900 shadow-xs ring-1 ring-purple-400"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isMarked ? "fill-purple-600 text-purple-700" : ""}`} />
            {isMarked ? "Marcada para Revisão" : "Marcar para Revisão"}
          </button>

          {/* Botão para Abrir Grid de Questões */}
          <button
            type="button"
            onClick={() => setShowGridDrawer(!showGridDrawer)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
            Navegador ({answeredCount}/{totalQuestions})
          </button>
        </div>
      </div>

      {/* Grid de Navegação de Questões (Drawer Expansível) */}
      {showGridDrawer && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-700">
            <span>Visão Geral das {totalQuestions} Perguntas</span>
            <div className="flex items-center gap-3 text-[11px] font-normal text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Respondida
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Revisão
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" /> Em branco
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-13 gap-2">
            {allQuestions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const hasAnswer = mode === "ESTUDO" ? !!studyFeedback[q.id] : !!answers[q.id];
              const isRev = !!markedForReview[q.id];

              let buttonStyle = "border-slate-200 bg-slate-50 text-slate-700";
              if (isRev) {
                buttonStyle = "border-purple-400 bg-purple-100 text-purple-950 font-bold ring-1 ring-purple-400";
              } else if (hasAnswer) {
                buttonStyle = "border-amber-500 bg-amber-500/15 text-amber-950 font-bold";
              }

              if (isCurrent) {
                buttonStyle += " ring-2 ring-slate-900 border-slate-900";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    onJumpToQuestion(idx);
                    setShowGridDrawer(false);
                  }}
                  className={`h-9 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all ${buttonStyle}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Card da Questão */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        {/* Barra de Progresso Superior */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>
              Questão <strong className="text-slate-900 font-bold">{currentIndex + 1}</strong> de{" "}
              {totalQuestions}
            </span>
            <span>{answeredCount} de {totalQuestions} respondidas</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Metadados: somente o domínio (o tópico pode revelar a resposta) */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
            {question.domain}
          </span>
          {isMarked && (
            <span className="text-xs font-bold px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-md flex items-center gap-1">
              <Bookmark className="w-3 h-3 fill-purple-600" />
              Marcada para revisão
            </span>
          )}
        </div>

        {/* Enunciado */}
        <div className="mb-8">
          <h2 className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
            {question.stem}
          </h2>
        </div>

        {/* Alternativas (Exatamente 4 Alternativas de Conteúdo + 5ª Opção "Não sei") */}
        <div className="space-y-3 mb-8">
          {question.options.map((option, idx) => {
            const isSelected = selectedOptionId === option.id;
            const isDontKnow = option.id === DONT_KNOW_OPTION_ID;
            const isCorrectOption = feedback?.correctOptionId === option.id;
            const isSelectedIncorrect = isSelected && feedback && !feedback.isCorrect;

            if (isDontKnow) {
              // 5ª Opção Fixa Obrigatória: "Não sei"
              return (
                <div key={option.id} className="pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectOption(option.id)}
                    disabled={isStudyConfirmed}
                    className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/70 text-sky-950 font-semibold ring-2 ring-sky-400/40"
                        : "border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50 text-slate-700"
                    } ${isStudyConfirmed ? "cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? "bg-sky-500 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold">{option.text}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                </div>
              );
            }

            // As 4 Alternativas Normais (A, B, C, D)
            const letter = optionLetters[idx] || `${idx + 1}`;

            return (
              <div key={option.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectOption(option.id)}
                    disabled={isStudyConfirmed}
                    className={`flex-1 p-4 rounded-xl border text-left flex items-start justify-between transition-all ${
                    isCorrectOption
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-medium"
                      : isSelectedIncorrect
                        ? "border-rose-400 bg-rose-50 text-rose-950 font-medium"
                        : isSelected
                          ? "border-amber-500 bg-amber-50/60 text-slate-950 font-medium ring-2 ring-amber-400/40 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 text-slate-800"
                  } ${isStudyConfirmed ? "cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-start gap-3.5 pr-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isCorrectOption
                          ? "bg-emerald-600 text-white"
                          : isSelectedIncorrect
                            ? "bg-rose-500 text-white"
                            : isSelected
                              ? "bg-amber-500 text-slate-950"
                              : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-sm leading-relaxed mt-0.5">
                      {option.text}
                      {isCorrectOption && (
                        <span className="block mt-1 text-xs font-bold text-emerald-700">Resposta correta</span>
                      )}
                      {isSelectedIncorrect && (
                        <span className="block mt-1 text-xs font-bold text-rose-700">Sua resposta</span>
                      )}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border shrink-0 mt-1 flex items-center justify-center transition-colors ${
                      isCorrectOption
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : isSelected
                          ? "border-amber-500 bg-amber-500 text-slate-950"
                          : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <div className={`w-2 h-2 rounded-full ${isCorrectOption ? "bg-white" : "bg-slate-950"}`} />}
                  </div>
                  </button>
                  {mode === "ESTUDO" && (
                    <label className="min-h-12 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600 cursor-pointer hover:bg-amber-50 hover:border-amber-200">
                      <input
                        type="checkbox"
                        aria-label={`Não conheço o significado da alternativa ${letter}`}
                        checked={unknownOptionIds.includes(option.id)}
                        onChange={() => onToggleUnknownOption(question.id, option.id)}
                        className="h-4 w-4 accent-amber-500"
                      />
                      <span className="hidden sm:inline">Não conheço</span>
                    </label>
                  )}
                </div>
                {feedback && (
                  <div
                    role="status"
                    className={`ml-10 rounded-lg border px-3 py-2 text-sm ${
                      isCorrectOption
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <p className="font-semibold">
                      Alternativa {letter} — {isCorrectOption ? "correta" : "incorreta"}
                      {isSelected && !isCorrectOption ? " (sua resposta)" : ""}
                    </p>
                    <p className="mt-1 leading-relaxed">{getOptionExplanation(feedback, option.id)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {mode === "ESTUDO" && (
          feedback ? (
            <section
              role="status"
              className={`mb-6 rounded-xl border p-4 ${
                feedback.isCorrect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
            >
              <p className="font-bold">
                {selectedOptionId === DONT_KNOW_OPTION_ID
                  ? `Você marcou “Não sei”. A resposta correta é a alternativa ${
                      optionLetters[question.options.findIndex((option) => option.id === feedback.correctOptionId)]
                    }.`
                  : feedback.isCorrect
                    ? "Resposta correta!"
                    : `Resposta incorreta. A alternativa correta é ${
                        optionLetters[question.options.findIndex((option) => option.id === feedback.correctOptionId)]
                      }.`}
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                A justificativa de cada alternativa está identificada logo abaixo dela.
              </p>
            </section>
          ) : (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Escolha uma alternativa e confirme para ver a explicação.
              </p>
              <button
                type="button"
                onClick={onConfirmStudyAnswer}
                disabled={!selectedOptionId || isConfirmingAnswer}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConfirmingAnswer ? "Verificando..." : "Confirmar resposta"}
              </button>
            </div>
          )
        )}

        {mode === "ESTUDO" && (
          <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-800">Sinalizar problema nesta questão</h3>
            <p className="mt-1 text-xs text-slate-500">
              Seu feedback será registrado e considerado em gerações futuras; ele não altera sua resposta ou pontuação.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {([
                ["ERRADA", "Questão errada"],
                ["REPETIDA", "Questão repetida"],
                ["DIFICULDADE_INCORRETA", "Dificuldade incorreta"],
              ] as const).map(([category, label]) => {
                const active = Object.prototype.hasOwnProperty.call(reportedFeedback, category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onQuestionFeedback(
                        question.id,
                        category,
                        !active,
                        category === "DIFICULDADE_INCORRETA"
                          ? (reportedFeedback[category] as DifficultyDirection | undefined) ?? "MAIS_FACIL"
                          : undefined
                      )
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      active
                        ? "border-amber-400 bg-amber-100 text-amber-950"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {active ? "✓ " : ""}{label}
                  </button>
                );
              })}
            </div>
            {Object.prototype.hasOwnProperty.call(reportedFeedback, "DIFICULDADE_INCORRETA") && (
              <fieldset className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <legend className="sr-only">Ajuste de dificuldade</legend>
                {([
                  ["MAIS_FACIL", "Mais fácil do que deveria"],
                  ["MAIS_DIFICIL", "Mais difícil do que deveria"],
                ] as const).map(([direction, label]) => (
                  <label key={direction} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`difficulty-${question.id}`}
                      checked={reportedFeedback.DIFICULDADE_INCORRETA === direction}
                      onChange={() =>
                        onQuestionFeedback(question.id, "DIFICULDADE_INCORRETA", true, direction)
                      }
                      className="accent-amber-500"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            )}
          </section>
        )}

        {/* Controles de Navegação */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onPrevious}
            disabled={isFirst}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-sm transition-all shadow-xs"
            >
              Finalizar
            </button>

            {!isLast && (
              <button
                type="button"
                onClick={onNext}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-sm flex items-center gap-1.5"
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Finalização */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">
                Confirmar Finalização do Simulado
              </h3>
            </div>

            <div className="space-y-3 mb-6 text-sm text-slate-600">
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                <span>Perguntas respondidas:</span>
                <strong className="text-slate-900">{answeredCount} de {totalQuestions}</strong>
              </div>
              {unansweredCount > 0 && (
                <div className="flex justify-between p-2.5 bg-rose-50 text-rose-700 rounded-lg">
                  <span>Perguntas em branco:</span>
                  <strong className="text-rose-900">{unansweredCount}</strong>
                </div>
              )}
              {reviewedCount > 0 && (
                <div className="flex justify-between p-2.5 bg-purple-50 text-purple-700 rounded-lg">
                  <span>Marcadas para revisão:</span>
                  <strong className="text-purple-900">{reviewedCount}</strong>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">
                {mode === "ESTUDO"
                  ? "Após finalizar, você verá a nota, o desempenho por domínio e tópico e a explicação de cada questão."
                  : "Após finalizar, você verá apenas a nota e o desempenho. No Modo Prova não há gabarito nem explicações."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Continuar Prova
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setShowConfirmModal(false);
                  onFinish();
                }}
                className="px-5 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all shadow-sm"
              >
                {isSubmitting ? "Enviando..." : "Sim, Finalizar Agora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
