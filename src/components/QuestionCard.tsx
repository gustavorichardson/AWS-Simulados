import React from "react";
import { QuestionPublicView, DONT_KNOW_OPTION_ID } from "../types/exam";
import { ChevronLeft, ChevronRight, CheckCircle2, HelpCircle } from "lucide-react";

interface QuestionCardProps {
  question: QuestionPublicView;
  currentIndex: number;
  totalQuestions: number;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentIndex,
  totalQuestions,
  selectedOptionId,
  onSelectOption,
  onPrevious,
  onNext,
  onFinish,
}) => {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  // Letras das opções para as 4 primeiras
  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto">
      {/* Barra de Progresso Superior */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>
            Questão <strong className="text-slate-900">{currentIndex + 1}</strong> de{" "}
            {totalQuestions}
          </span>
          <span>{progressPercent}% Concluído</span>
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
      </div>

      {/* Enunciado da Questão */}
      <div className="mb-8">
        <h2 className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
          {question.stem}
        </h2>
      </div>

      {/* Alternativas (4 Opções de Conteúdo + 5ª Opção "Não sei") */}
      <div className="space-y-3 mb-8">
        {question.options.map((option, idx) => {
          const isSelected = selectedOptionId === option.id;
          const isDontKnow = option.id === DONT_KNOW_OPTION_ID;

          if (isDontKnow) {
            // Renderização especial da 5ª opção "Não sei"
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
                        Não penaliza mais que erro e orienta a recuperação de estudo
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

          // Alternativas convencionais (A, B, C, D)
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

        {isLast ? (
          <button
            type="button"
            onClick={onFinish}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-sm hover:shadow flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finalizar Simulado
          </button>
        ) : (
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
  );
};
