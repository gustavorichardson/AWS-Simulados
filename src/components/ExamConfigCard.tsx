import React, { useState } from "react";
import {
  VALID_QUESTION_COUNTS,
  ValidQuestionCount,
  ExamDomain,
  ExamMode,
  QuestionDifficulty,
  QUESTION_DIFFICULTIES,
} from "../types/exam";
import {
  ALL_DOMAINS_LABEL,
  SelectionState,
  toggleDomainSelection,
  toggleSubtopicSelection,
  selectAllTopicsExclusive,
} from "../lib/topic-selection";
import { DOMAIN_HIERARCHIES } from "../types/subtopics";
import {
  BookOpen,
  Layers,
  Check,
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ExamConfigCardProps {
  selectedCount: ValidQuestionCount;
  onCountChange: (count: ValidQuestionCount) => void;
  difficulty: QuestionDifficulty;
  onDifficultyChange: (difficulty: QuestionDifficulty) => void;
  selection: SelectionState;
  onSelectionChange: (selection: SelectionState) => void;
  onStartExam: (mode: ExamMode) => void;
  isLoading?: boolean;
}

export const ExamConfigCard: React.FC<ExamConfigCardProps> = ({
  selectedCount,
  onCountChange,
  difficulty,
  onDifficultyChange,
  selection,
  onSelectionChange,
  onStartExam,
  isLoading = false,
}) => {
  // Estado para controlar quais menus suspensos de subtópicos estão abertos
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [examMode, setExamMode] = useState<ExamMode | null>(null);

  const toggleAccordion = (domain: string) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [domain]: !prev[domain],
    }));
  };

  const handleSelectAll = () => {
    onSelectionChange(selectAllTopicsExclusive());
  };

  const handleToggleDomain = (domain: ExamDomain) => {
    const updated = toggleDomainSelection(selection, domain);
    onSelectionChange(updated);
  };

  const handleToggleSubtopic = (domain: ExamDomain, subtopic: string) => {
    const updated = toggleSubtopicSelection(selection, domain, subtopic);
    onSelectionChange(updated);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-amber-400 text-xs font-bold shadow-xs">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Certificação: AWS CLF-C02 (Fixa)</span>
          </div>

        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Configuração do Simulado
        </h1>
        <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
          Configure a quantidade de questões e explore os menus suspensos caso queira
          estudar <strong className="text-slate-900">subtópicos específicos</strong> dentro de cada domínio.
        </p>
      </div>

      {/* 1. Seleção da Quantidade de Questões */}
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

      {/* 2. Nível de dificuldade */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-slate-800 mb-3">2. Escolha a dificuldade</h3>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          role="radiogroup"
          aria-label="Dificuldade do simulado"
        >
          {QUESTION_DIFFICULTIES.map((level) => {
            const labels: Record<QuestionDifficulty, { title: string; description: string }> = {
              EASY: {
                title: "Fácil",
                description: "Conceitos fundamentais com contexto mais direto.",
              },
              MEDIUM: {
                title: "Médio",
                description: "Cenários breves que exigem interpretar o contexto.",
              },
              HARD: {
                title: "Difícil",
                description: "Limite do nível Cloud Practitioner; respostas sem contexto.",
              },
            };
            const isSelected = difficulty === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onDifficultyChange(level)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/40"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="font-bold text-sm text-slate-900">{labels[level].title}</span>
                <span className="block mt-1 text-xs text-slate-500">{labels[level].description}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Todos os níveis respeitam o conteúdo e o limite de dificuldade da certificação AWS Cloud Practitioner (CLF-C02).
        </p>
      </div>

      {/* 3. Seleção de Domínios e Subtópicos com Menus Suspensos */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Layers className="w-4 h-4 text-amber-500" />
            Domínios e Subtópicos do Exame
          </label>
          <span className="text-xs text-slate-500 font-medium">
            (Opção &quot;Todos&quot; é exclusiva)
          </span>
        </div>

        <div className="space-y-3">
          {/* Opção EXCLUSIVA: Todos os Tópicos */}
          <div
            onClick={handleSelectAll}
            role="button"
            tabIndex={0}
            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
              selection.isAllSelected
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
                selection.isAllSelected
                  ? "bg-amber-500 border-amber-500 text-slate-950"
                  : "border-slate-300 bg-white"
              }`}
            >
              {selection.isAllSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>

          {/* Menus Suspensos para cada um dos 4 Domínios */}
          {DOMAIN_HIERARCHIES.map((hierarchy) => {
            const isDomainFullySelected =
              !selection.isAllSelected &&
              selection.selectedDomains.includes(hierarchy.domain) &&
              hierarchy.subtopics.every((s) => selection.selectedSubtopics.includes(s));

            const isDomainPartiallySelected =
              !selection.isAllSelected &&
              hierarchy.subtopics.some((s) => selection.selectedSubtopics.includes(s)) &&
              !isDomainFullySelected;

            const selectedInThisDomainCount = hierarchy.subtopics.filter((s) =>
              selection.selectedSubtopics.includes(s)
            ).length;

            const isExpanded = !!expandedDomains[hierarchy.domain];

            return (
              <div
                key={hierarchy.domain}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white transition-all shadow-2xs"
              >
                {/* Linha Principal do Domínio */}
                <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Checkbox do Domínio Completo */}
                    <div
                      onClick={() => handleToggleDomain(hierarchy.domain)}
                      role="checkbox"
                      aria-checked={isDomainFullySelected}
                      tabIndex={0}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${
                        isDomainFullySelected
                          ? "bg-amber-500 border-amber-500 text-slate-950"
                          : isDomainPartiallySelected
                          ? "bg-amber-200 border-amber-400 text-amber-950"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {(isDomainFullySelected || isDomainPartiallySelected) && (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </div>

                    <div
                      onClick={() => toggleAccordion(hierarchy.domain)}
                      className="cursor-pointer flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                          {hierarchy.domain}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          ~{hierarchy.weightPercentage}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 hidden sm:block">
                        {hierarchy.description}
                      </p>
                    </div>
                  </div>

                  {/* Botão de Expandir / Menu Suspenso de Subtópicos */}
                  <button
                    type="button"
                    onClick={() => toggleAccordion(hierarchy.domain)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                  >
                    <span>
                      {selectedInThisDomainCount}/{hierarchy.subtopics.length} Subtópicos
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Menu Suspenso (Dropdown de Subtópicos) */}
                {isExpanded && (
                  <div className="p-3 bg-white border-t border-slate-100 space-y-1.5 pl-6 sm:pl-10">
                    <p className="text-[11px] font-semibold text-slate-500 mb-2">
                      Selecione subtópicos específicos deste domínio:
                    </p>
                    {hierarchy.subtopics.map((subtopic) => {
                      const isSubtopicSelected =
                        !selection.isAllSelected &&
                        selection.selectedSubtopics.includes(subtopic);

                      return (
                        <div
                          key={subtopic}
                          onClick={() => handleToggleSubtopic(hierarchy.domain, subtopic)}
                          role="checkbox"
                          aria-checked={isSubtopicSelected}
                          tabIndex={0}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isSubtopicSelected
                              ? "border-amber-400 bg-amber-50/50 text-amber-950 font-medium"
                              : "border-slate-100 hover:border-slate-200 bg-slate-50/30 text-slate-700"
                          }`}
                        >
                          <span>{subtopic}</span>
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isSubtopicSelected
                                ? "bg-amber-500 border-amber-500 text-slate-950"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSubtopicSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Modo do simulado */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-slate-800 mb-3">3. Escolha o modo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Modo do simulado">
          {([
            {
              value: "ESTUDO" as ExamMode,
              title: "Modo Estudo",
              description:
                "Confirme cada resposta para ver na hora se acertou e a explicação. Ao finalizar, veja também a nota e o desempenho.",
              icon: BookOpen,
            },
            {
              value: "PROVA" as ExamMode,
              title: "Modo Prova",
              description: "Ao finalizar, você vê somente a nota e o desempenho. Sem gabarito e sem explicações.",
              icon: Award,
            },
          ]).map((option) => {
            const isSelected = examMode === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`modo-${option.value.toLowerCase()}`}
                onClick={() => setExamMode(option.value)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/40"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                  <Icon className="w-4 h-4 text-amber-600" />
                  {option.title}
                </div>
                <p className="text-xs text-slate-500 mt-1">{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Botão de Iniciar */}
      <button
        type="button"
        disabled={
          isLoading ||
          !examMode ||
          (!selection.isAllSelected && selection.selectedSubtopics.length === 0)
        }
        onClick={() => examMode && onStartExam(examMode)}
        className="w-full py-4 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5" />
        {isLoading
          ? "Preparando o simulado..."
          : !examMode
          ? "Escolha o Modo Estudo ou o Modo Prova"
          : `Iniciar ${examMode === "ESTUDO" ? "Modo Estudo" : "Modo Prova"} (${selectedCount} questões)`}
      </button>
    </div>
  );
};
