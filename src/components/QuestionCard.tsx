import React, { useState } from "react";
import { QuestionPublicView, DONT_KNOW_OPTION_ID } from "../types/exam";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
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
  markedForReview: Record<string, boolean>;
  onSelectOption: (optionId: string) => void;
  onToggleReview: (questionId: string) => void;
  onJumpToQuestion: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  isSubmitting?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentIndex,
  totalQuestions,
  allQuestions,
  answers,
  markedForReview,
  onSelectOption,
  onToggleReview,
  onJumpToQuestion,
  onPrevious,
  onNext,
  onFinish,
  isSubmitting = false,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showGridDrawer, setShowGridDrawer] = useState(false);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const selectedOptionId = answers[question.id] ?? null;
  const isMarked = !!markedForReview[question.id];

  const answeredCount = Object.keys(answers).length;
  const reviewedCount = Object.values(markedForReview).filter(Boolean).length;
  const unansweredCount = totalQuestions - answeredCount;

  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Barra de Status Superior do Exame */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold">
            <Award className="w-3.5 h-3.5" />
            AWS CLF-C02
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-600" />
            Difícil
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
              const hasAnswer = !!answers[q.id];
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
            <span>{progressPercent}% respondido</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Metadados: Domínio e Tópico */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
            {question.domain}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-md">
            {question.topic}
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

            if (isDontKnow) {
              // 5ª Opção Fixa Obrigatória: "Não sei"
              return (
                <div key={option.id} className="pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectOption(option.id)}
                    className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/70 text-sky-950 font-semibold ring-2 ring-sky-400/40"
                        : "border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50 text-slate-700"
                    }`}
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
                      <div>
                        <span className="text-sm font-semibold">{option.text}</span>
                        <span className="text-xs text-slate-500 block">
                          Assuma a dúvida pedagógica para gerar simulado de recuperação focado
                        </span>
                      </div>
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
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectOption(option.id)}
                className={`w-full p-4 rounded-xl border text-left flex items-start justify-between transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-50/60 text-slate-950 font-medium ring-2 ring-amber-400/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 text-slate-800"
                }`}
              >
                <div className="flex items-start gap-3.5 pr-3">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm leading-relaxed mt-0.5">{option.text}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border shrink-0 mt-1 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "border-amber-500 bg-amber-500 text-slate-950"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                </div>
              </button>
            );
          })}
        </div>

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
                Após finalizar, suas respostas serão submetidas ao servidor para correção e o
                gabarito com as explicações técnicas completas será liberado.
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
