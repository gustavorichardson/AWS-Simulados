import React from "react";
import {
  ExamDomain,
  EXAM_DOMAINS,
  VALID_QUESTION_COUNTS,
  ValidQuestionCount,
} from "../types/exam";
import { BookOpen, Layers, Check, Sparkles, HelpCircle } from "lucide-react";

interface ExamConfigCardProps {
  selectedCount: ValidQuestionCount;
  onCountChange: (count: ValidQuestionCount) => void;
  selectedDomains: ExamDomain[];
  onToggleDomain: (domain: ExamDomain) => void;
  onSelectAllDomains: () => void;
  onStartExam: () => void;
  availableQuestionsCount: number;
}

export const ExamConfigCard: React.FC<ExamConfigCardProps> = ({
  selectedCount,
  onCountChange,
  selectedDomains,
  onToggleDomain,
  onSelectAllDomains,
  onStartExam,
  availableQuestionsCount,
}) => {
  const isAllSelected = selectedDomains.length === EXAM_DOMAINS.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Configurar Novo Simulado
        </h1>
        <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
          Selecione a quantidade de perguntas e os domínios oficiais da prova. Lembre-se:
          todas as questões trazem a opção pedagógica <strong className="text-slate-800">"Não sei"</strong> para
          diagnosticar o que você realmente precisa revisar.
        </p>
      </div>

      {/* 1. Seleção da Quantidade de Questões */}
      <div className="mb-8">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
          <BookOpen className="w-4 h-4 text-amber-500" />
          Quantidade de Questões
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VALID_QUESTION_COUNTS.map((count) => {
            const isSelected = selectedCount === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => onCountChange(count)}
                className={`py-3.5 px-4 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "bg-amber-500/10 border-amber-500 text-amber-950 font-bold shadow-sm ring-2 ring-amber-500/30"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <div className="text-xl font-extrabold">{count}</div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">
                  {count === 65 ? "Oficial AWS" : "Perguntas"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Seleção de Domínios */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Layers className="w-4 h-4 text-amber-500" />
            Domínios do Exame CLF-C02
          </label>
          <button
            type="button"
            onClick={onSelectAllDomains}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline"
          >
            {isAllSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>
        </div>

        <div className="space-y-2.5">
          {EXAM_DOMAINS.map((domain) => {
            const checked = selectedDomains.includes(domain);
            return (
              <div
                key={domain}
                onClick={() => onToggleDomain(domain)}
                role="button"
                tabIndex={0}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  checked
                    ? "border-amber-400/80 bg-amber-50/40 text-slate-900"
                    : "border-slate-200 bg-slate-50/30 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-sm font-medium">{domain}</span>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    checked
                      ? "bg-amber-500 border-amber-500 text-slate-950"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
        {selectedDomains.length === 0 && (
          <p className="text-xs text-rose-600 mt-2 font-medium">
            Selecione pelo menos um domínio para prosseguir.
          </p>
        )}
      </div>

      {/* 3. Destaque Pedagógico da Opção "Não sei" */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-8 flex gap-3 text-xs text-slate-600 leading-relaxed">
        <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800 font-semibold block mb-0.5">
            Dica Pedagógica do Método:
          </strong>
          Ao se deparar com uma questão cujo tema você desconhece ou tem dúvida completa,
          escolha a opção <strong className="text-slate-900">"Não sei"</strong> em vez de chutar.
          Isso permitirá gerar um simulado de recuperação focado nas suas reais deficiências.
        </div>
      </div>

      {/* Botão de Início */}
      <button
        type="button"
        disabled={selectedDomains.length === 0}
        onClick={onStartExam}
        className="w-full py-4 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        Iniciar Simulado ({selectedCount} Perguntas)
      </button>
    </div>
  );
};
