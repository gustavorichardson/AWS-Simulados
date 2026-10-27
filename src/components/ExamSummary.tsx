import React, { useState } from "react";
import { ExamEvaluationResult, DONT_KNOW_OPTION_ID } from "../types/exam";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  MinusCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ExamSummaryProps {
  result: ExamEvaluationResult;
  onNewExam: () => void;
  onStartRecoveryExam: (recoveryTopics: string[]) => void;
}

export const ExamSummary: React.FC<ExamSummaryProps> = ({
  result,
  onNewExam,
  onStartRecoveryExam,
}) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedQuestionId(expandedQuestionId === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Cartão Principal de Resultado e Escala AWS */}
      <div
        className={`rounded-2xl border p-6 sm:p-8 shadow-sm transition-all ${
          result.isPassed
            ? "bg-emerald-50/50 border-emerald-200"
            : "bg-amber-50/40 border-amber-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                result.isPassed
                  ? "bg-emerald-500 text-white"
                  : "bg-amber-500 text-slate-950"
              }`}
            >
              {result.isPassed ? (
                <Trophy className="w-8 h-8" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )}
            </div>
            <div>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  result.isPassed
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {result.isPassed ? "Aprovado no Simulado" : "Em Fase de Aprendizado"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {result.percentageScore}% de Aproveitamento
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Pontuação estimada na escala AWS:{" "}
                <strong className="text-slate-900 font-bold">
                  {result.estimatedScaledScore} / 1000
                </strong>{" "}
                (Nota de corte oficial: 700)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {result.recoveryTopics.length > 0 && (
              <button
                type="button"
                onClick={() => onStartRecoveryExam(result.recoveryTopics)}
                className="flex-1 sm:flex-none py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Simulado de Recuperação ({result.recoveryTopics.length} Tópicos)
              </button>
            )}
            <button
              type="button"
              onClick={onNewExam}
              className="flex-1 sm:flex-none py-3 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Novo Simulado
            </button>
          </div>
        </div>
      </div>

      {/* 2. Grid dos 4 Estados de Resposta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Corretas */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Corretas
          </div>
          <div className="text-2xl font-black text-slate-900">{result.correctCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Pontos válidos</div>
        </div>

        {/* Erros Conceituais */}
        <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs mb-1">
            <XCircle className="w-4 h-4" />
            Erros Conceituais
          </div>
          <div className="text-2xl font-black text-slate-900">{result.incorrectCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Alternativas incorretas</div>
        </div>

        {/* Dúvidas Assumidas ("Não sei") */}
        <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-sky-700 font-semibold text-xs mb-1">
            <HelpCircle className="w-4 h-4" />
            "Não Sei" (Dúvidas)
          </div>
          <div className="text-2xl font-black text-slate-900">{result.dontKnowCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Lacunas de conhecimento</div>
        </div>

        {/* Não respondidas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-600 font-semibold text-xs mb-1">
            <MinusCircle className="w-4 h-4" />
            Em Branco
          </div>
          <div className="text-2xl font-black text-slate-900">{result.unansweredCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Não assinaladas</div>
        </div>
      </div>

      {/* 3. Desempenho por Domínio Oficial */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Desempenho por Domínio CLF-C02
        </h3>
        <div className="space-y-4">
          {Object.entries(result.domainBreakdown).map(([domain, stats]) => {
            if (stats.total === 0) return null;
            const domainPercent = Math.round((stats.correct / stats.total) * 100);
            return (
              <div key={domain} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{domain}</span>
                  <span className="font-bold text-slate-600">
                    {stats.correct}/{stats.total} ({domainPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-2 transition-all"
                    style={{ width: `${(stats.correct / stats.total) * 100}%` }}
                    title={`Corretas: ${stats.correct}`}
                  />
                  <div
                    className="bg-rose-500 h-2 transition-all"
                    style={{ width: `${(stats.incorrect / stats.total) * 100}%` }}
                    title={`Erros: ${stats.incorrect}`}
                  />
                  <div
                    className="bg-sky-500 h-2 transition-all"
                    style={{ width: `${(stats.dontKnow / stats.total) * 100}%` }}
                    title={`Não sei: ${stats.dontKnow}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Gabarito Comentado e Revisão Didática Pós-Prova */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Gabarito Comentado & Análise das Questões
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Com o simulado concluído, veja a justificativa técnica detalhada de cada item para fixar o aprendizado.
        </p>

        <div className="space-y-3">
          {result.detailedAnswers.map((answer, index) => {
            const isExpanded = expandedQuestionId === answer.questionId;
            const statusConfig = {
              CORRETA: {
                badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
                label: "Correta",
                icon: CheckCircle2,
              },
              ERRADA: {
                badge: "bg-rose-100 text-rose-800 border-rose-300",
                label: "Incorreta",
                icon: XCircle,
              },
              NAO_SEI: {
                badge: "bg-sky-100 text-sky-800 border-sky-300",
                label: "Não Sei",
                icon: HelpCircle,
              },
              NAO_RESPONDIDA: {
                badge: "bg-slate-100 text-slate-700 border-slate-300",
                label: "Não respondida",
                icon: MinusCircle,
              },
            }[answer.status];

            const Icon = statusConfig.icon;

            return (
              <div
                key={answer.questionId}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(answer.questionId)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-slate-400 w-6">
                      #{index + 1}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusConfig.badge}`}
                    >
                      <Icon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                    <span className="text-xs font-medium text-slate-600 line-clamp-1">
                      {answer.stem}
                    </span>
                  </div>
                  <div className="text-slate-400 shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-white border-t border-slate-100 space-y-4">
                    <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                      {answer.stem}
                    </p>

                    <div className="space-y-2">
                      {answer.options.map((opt) => {
                        const isCorrect = opt.id === answer.correctOptionId;
                        const isUserChoice = opt.id === answer.selectedOptionId;

                        let style = "border-slate-200 bg-white text-slate-700";
                        if (isCorrect) {
                          style = "border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold";
                        } else if (isUserChoice && !isCorrect) {
                          style = "border-rose-400 bg-rose-50 text-rose-950 font-semibold";
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-lg border text-xs flex items-center justify-between ${style}`}
                          >
                            <span>{opt.text}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {isUserChoice && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                                  Sua escolha
                                </span>
                              )}
                              {isCorrect && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                                  Gabarito
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200/70 text-xs text-amber-950">
                      <strong className="block font-bold mb-1">Explicação Técnica:</strong>
                      {answer.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
