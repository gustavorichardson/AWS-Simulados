"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Clock3, Database, Sparkles } from "lucide-react";

type CategoryMetric = {
  category: string;
  received: number;
  appliedInGeneration: number;
  pending: number;
  correctionsImplemented: number;
  resolvedWithEvidence: number;
  recurrences: number;
  recurrenceRate: number | null;
};

interface FeedbackReport {
  totals: {
    received: number;
    appliedInGeneration: number;
    pending: number;
    correctionsImplemented: number;
    resolvedWithEvidence: number;
  };
  categories: CategoryMetric[];
  breakdowns: Array<{
    category: string;
    difficulty: string;
    domain: string;
    topic: string;
    received: number;
    applied: number;
  }>;
  trend: {
    current30DayRate: number | null;
    previous30DayRate: number | null;
    classification: "MELHORANDO" | "ESTAVEL" | "PIORANDO" | "DADOS_INSUFICIENTES";
    currentFeedbackCount: number;
    previousFeedbackCount: number;
    currentExposureCount: number;
    previousExposureCount: number;
    enoughData: boolean;
  };
  examples: Array<{
    category: string;
    topic: string;
    domain: string;
    difficulty: string;
    questionExcerpt: string;
    usedInGeneration: boolean;
    correctionImplemented: boolean;
    resolvedWithEvidence: boolean;
  }>;
  history: Array<{
    date: string;
    metrics: { totals?: { received?: number; correctionsImplemented?: number } };
  }>;
}

const categoryLabels: Record<string, string> = {
  ERRADA: "Questões erradas",
  REPETIDA: "Questões repetidas",
  DIFICULDADE_INCORRETA: "Dificuldade incorreta",
};

export function FeedbackLearningReport() {
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/feedback/relatorio", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar o relatório.");
        setReport(data as FeedbackReport);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar o relatório.");
      });
  }, []);

  if (error) {
    return (
      <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        {error}
      </section>
    );
  }
  if (!report) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Carregando histórico de feedback e métricas verificáveis...
      </section>
    );
  }

  const values = report.history.map((item) => item.metrics.totals?.received ?? 0);
  const maxValue = Math.max(1, ...values);
  const points = values
    .map((value, index) => {
      const x = values.length < 2 ? 300 : (index / (values.length - 1)) * 600;
      const y = 110 - (value / maxValue) * 90;
      return `${x},${y}`;
    })
    .join(" ");
  const trendLabel: Record<FeedbackReport["trend"]["classification"], string> = {
    MELHORANDO: "Sinais de melhora",
    ESTAVEL: "Estável",
    PIORANDO: "Sinais de piora",
    DADOS_INSUFICIENTES: "Dados insuficientes para concluir",
  };
  const summaryCards: Array<{
    label: string;
    count: number;
    color: string;
    icon: typeof Database;
  }> = [
    { label: "Recebidos", count: report.totals.received, color: "text-slate-900", icon: Database },
    { label: "Usados na geração", count: report.totals.appliedInGeneration, color: "text-sky-800", icon: Sparkles },
    { label: "Pendentes", count: report.totals.pending, color: "text-amber-800", icon: Clock3 },
    { label: "Correções implementadas", count: report.totals.correctionsImplemented, color: "text-indigo-800", icon: Activity },
    { label: "Resolvidos com evidência", count: report.totals.resolvedWithEvidence, color: "text-emerald-800", icon: CheckCircle2 },
  ];

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Activity className="h-4 w-4 text-amber-500" />
              Aprendizagem por feedback das questões
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Indicadores derivados do banco. Usar um feedback no prompt não significa, por si só, que o problema foi resolvido.
            </p>
          </div>
          <span className="text-[11px] text-slate-400">
            Atualizado em {new Date().toLocaleString("pt-BR")}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {summaryCards.map(({ label, count, color, icon: MetricIcon }) => {
            return (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <MetricIcon className="h-3.5 w-3.5" />
                  {label}
                </p>
                <p className={`mt-1 text-2xl font-black ${color}`}>{count}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold text-slate-800">Histórico diário — feedbacks recebidos</h3>
            {report.history.length ? (
              <svg viewBox="0 0 600 125" role="img" aria-label="Gráfico histórico de feedbacks recebidos" className="mt-3 h-32 w-full">
                <line x1="0" y1="110" x2="600" y2="110" stroke="#cbd5e1" />
                <polyline points={points} fill="none" stroke="#f59e0b" strokeWidth="3" />
              </svg>
            ) : (
              <p className="mt-3 text-xs text-slate-500">O histórico será formado à medida que o relatório for consultado.</p>
            )}
            <p className="text-[10px] text-slate-400">Os registros diários são preservados no PostgreSQL local.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-xs font-bold text-slate-800">Qualidade observada nos últimos 30 dias</h3>
            <p className="mt-2 text-sm font-bold text-slate-900">{trendLabel[report.trend.classification]}</p>
            <p className="mt-1 text-xs text-slate-600">
              Taxa: {report.trend.current30DayRate ?? "—"} feedbacks por 100 respostas concluídas; período anterior:{" "}
              {report.trend.previous30DayRate ?? "—"}.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Amostra: {report.trend.currentFeedbackCount} feedbacks / {report.trend.currentExposureCount} respostas atuais e{" "}
              {report.trend.previousFeedbackCount} / {report.trend.previousExposureCount} no período anterior.
              {!report.trend.enoughData && " A classificação só aparece com amostra mínima suficiente."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Etapas por categoria</h3>
          <div className="mt-3 space-y-3">
            {report.categories.map((category) => (
              <div key={category.category} className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-bold text-slate-800">{categoryLabels[category.category]}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">
                  Recebidos {category.received} · Aplicados {category.appliedInGeneration} · Pendentes {category.pending} ·
                  Implementados {category.correctionsImplemented} · Resolvidos {category.resolvedWithEvidence}
                </p>
                <p className="text-[11px] text-slate-500">
                  Reincidências {category.recurrences} · taxa{" "}
                  {category.recurrenceRate === null ? "sem base" : `${category.recurrenceRate}%`}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Exemplos e medida rastreada</h3>
          {report.examples.length ? (
            <ul className="mt-3 space-y-3">
              {report.examples.map((example, index) => (
                <li key={`${example.category}-${example.topic}-${index}`} className="border-l-2 border-amber-400 pl-3">
                  <p className="text-[11px] font-bold text-slate-800">
                    {categoryLabels[example.category]} · {example.topic} · {example.difficulty}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600">{example.questionExcerpt}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {example.usedInGeneration ? "Feedback enviado ao prompt" : "Aguardando geração"} ·{" "}
                    {example.correctionImplemented ? "questão gerada e persistida" : "sem correção persistida"} ·{" "}
                    {example.resolvedWithEvidence ? "melhoria observada após exposição" : "sem evidência de resolução"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Nenhum feedback recebido ainda.</p>
          )}
        </div>
      </div>

      {report.breakdowns.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Métricas por dificuldade, tópico e problema</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr><th className="py-2">Categoria</th><th>Tópico</th><th>Dificuldade</th><th>Recebidos</th><th>Aplicados</th></tr>
              </thead>
              <tbody>
                {report.breakdowns.slice(0, 20).map((item) => (
                  <tr key={`${item.category}-${item.topic}-${item.difficulty}`} className="border-b border-slate-100">
                    <td className="py-2">{categoryLabels[item.category]}</td>
                    <td>{item.topic}</td><td>{item.difficulty}</td><td>{item.received}</td><td>{item.applied}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
