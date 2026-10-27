import React from "react";
import {
  VALID_QUESTION_COUNTS,
  ValidQuestionCount,
  EXAM_DOMAINS,
  ExamDomain,
} from "../types/exam";
import {
  ALL_DOMAINS_KEY,
  ALL_DOMAINS_LABEL,
  toggleTopicSelection,
} from "../lib/topic-selection";
import {
  BookOpen,
  Layers,
  Check,
  Sparkles,
  Shield,
  Award,
  Flame,
  Info,
} from "lucide-react";

interface ExamConfigCardProps {
  selectedCount: ValidQuestionCount;
  onCountChange: (count: ValidQuestionCount) => void;
  selectedTopics: string[];
  onTopicsChange: (topics: string[]) => void;
  onStartExam: () => void;
  isLoading?: boolean;
}

export const ExamConfigCard: React.FC<ExamConfigCardProps> = ({
  selectedCount,
  onCountChange,
  selectedTopics,
  onTopicsChange,
  onStartExam,
  isLoading = false,
}) => {
  const isAllTopicsSelected = selectedTopics.includes(ALL_DOMAINS_KEY);

  const handleToggleTopic = (topicKey: string) => {
    const updated = toggleTopicSelection(selectedTopics, topicKey);
    onTopicsChange(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Certificação Fixa */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-amber-400 text-xs font-bold shadow-xs">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Certificação: AWS CLF-C02 (Fixa)</span>
          </div>

          {/* Dificuldade Fixa */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs">
            <Flame className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
            <span>Dificuldade: Difícil (Fixa)</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Configuração do Simulado
        </h1>
        <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
          Simulado de alta fidelidade para o exame AWS Certified Cloud Practitioner.
          Questões com 4 alternativas mais a 5ª opção obrigatória{" "}
          <strong className="text-slate-900">"Não sei"</strong>.
        </p>
      </div>

      {/* Aviso de Transparência do Conjunto Fictício Local */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-8 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Origem dos Dados:</span>{" "}
          Conjunto de dados de teste estático e fictício criado manualmente no projeto.
          <strong className="text-slate-900"> NÃO foi gerado por Inteligência Artificial</strong>{" "}
          nem por serviços de nuvem externos nesta fase.
        </div>
      </div>

      {/* 1. Seleção da Quantidade de Questões (15, 30, 45, 65) */}
      <div className="mb-8">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
          <BookOpen className="w-4 h-4 text-amber-500" />
          Quantidade de Perguntas
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
                  {count === 65 ? "Exame Completo" : "Perguntas"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Seleção de Tópicos com "Todos os tópicos" Exclusivo */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Layers className="w-4 h-4 text-amber-500" />
            Tópicos e Domínios do Exame
          </label>
          <span className="text-xs text-slate-500 font-medium">
            (Opção "Todos" é exclusiva)
          </span>
        </div>

        <div className="space-y-2.5">
          {/* Opção EXCLUSIVA: Todos os Tópicos */}
          <div
            onClick={() => handleToggleTopic(ALL_DOMAINS_KEY)}
            role="button"
            tabIndex={0}
            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              isAllTopicsSelected
                ? "border-amber-500 bg-amber-50/60 text-amber-950 font-semibold ring-2 ring-amber-400/30"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold">{ALL_DOMAINS_LABEL}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                Exclusivo
              </span>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                isAllTopicsSelected
                  ? "bg-amber-500 border-amber-500 text-slate-950"
                  : "border-slate-300 bg-white"
              }`}
            >
              {isAllTopicsSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>

          {/* Tópicos / Domínios Individuais (Desmarcam "Todos os tópicos") */}
          {EXAM_DOMAINS.map((domain) => {
            const isChecked = selectedTopics.includes(domain);
            return (
              <div
                key={domain}
                onClick={() => handleToggleTopic(domain)}
                role="button"
                tabIndex={0}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all pl-5 ${
                  isChecked
                    ? "border-amber-400 bg-amber-50/40 text-slate-900 font-medium"
                    : "border-slate-200 bg-slate-50/30 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-xs sm:text-sm font-medium">{domain}</span>
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    isChecked
                      ? "bg-amber-500 border-amber-500 text-slate-950"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botão de Iniciar */}
      <button
        type="button"
        disabled={isLoading || selectedTopics.length === 0}
        onClick={onStartExam}
        className="w-full py-4 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        {isLoading
          ? "Carregando Simulado Local..."
          : `Iniciar Simulado (${selectedCount} Perguntas — Nível Difícil)`}
      </button>
    </div>
  );
};
