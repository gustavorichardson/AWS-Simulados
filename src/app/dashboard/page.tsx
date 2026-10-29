import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/Header";
import {
  GraduationCap,
  Trophy,
  History,
  ArrowRight,
  Sparkles,
  Calendar,
} from "lucide-react";
import { DashboardClientControls } from "./DashboardClientControls";
import { FeedbackLearningReport } from "@/components/FeedbackLearningReport";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // 1. Validação de Autorização Estrita no Servidor
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login?motivo=sessao-expirada");
  }

  // 2. Busca ou cria o Perfil do estudante de ADS
  let profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId: session.user.id,
        course: "Análise e Desenvolvimento de Sistemas (ADS)",
      },
    });
  }

  // 3. Busca o histórico de simulados do usuário autenticado 
  const attempts = await prisma.examAttempt.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
  });

  const finishedAttempts = attempts.filter((a) => a.finishedAt);
  const totalExams = finishedAttempts.length;
  const passedExams = finishedAttempts.filter((a) => a.isPassed).length;
  const averageScore =
    totalExams > 0
      ? Math.round(
          finishedAttempts.reduce((acc, a) => acc + (a.percentageScore ?? 0), 0) / totalExams
        )
      : 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Banner do Estudante */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-2xl">
              {session.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black">{session.user.name}</h1>
                <span className="text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2.5 py-0.5 rounded-full">
                  Sessão Autenticada
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-amber-400" />
                {profile.course} • {session.user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/simulado"
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Novo Simulado
            </Link>
            <DashboardClientControls />
          </div>
        </div>

        {/* Métricas do Perfil */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>Simulados Realizados</span>
              <History className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-slate-900">{totalExams}</div>
            <div className="text-xs text-slate-500 mt-1">Simulados realizados</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>Aprovações (&ge; 700 pts)</span>
              <Trophy className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-slate-900">{passedExams}</div>
            <div className="text-xs text-slate-500 mt-1">
              {totalExams > 0
                ? `${Math.round((passedExams / totalExams) * 100)}% de taxa de aprovação`
                : "Nenhum teste concluído"}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>Aproveitamento Médio</span>
              <GraduationCap className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-3xl font-black text-slate-900">{averageScore}%</div>
            <div className="text-xs text-slate-500 mt-1">Média ponderada de acertos</div>
          </div>
        </div>

        <div className="mb-8">
          <FeedbackLearningReport />
        </div>

        {/* Histórico Recente de Simulados */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500" />
              Histórico Pessoal de Simulados
            </h2>
          </div>

          {attempts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-sm font-semibold text-slate-700">
                Nenhum simulado salvo no seu histórico ainda.
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Inicie um simulado para testar seus conhecimentos e acompanhar sua evolução.
              </p>
              <Link
                href="/simulado"
                className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Começar Primeiro Simulado
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {attempt.questionCount} Questões
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        {attempt.mode === "ESTUDO" ? "Modo Estudo" : "Modo Prova"}
                      </span>
                      {attempt.isRecovery && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          Recuperação
                        </span>
                      )}
                      {attempt.finishedAt ? (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            attempt.isPassed
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {attempt.isPassed ? "Aprovado" : "Não Atingiu Nota"}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Em andamento
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(attempt.startedAt).toLocaleString("pt-BR")}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {attempt.finishedAt && (
                      <div className="text-right">
                        <div className="text-lg font-black text-slate-900">
                          {attempt.percentageScore ?? 0}%
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {attempt.estimatedScaledScore ?? 100} / 1000 pts
                        </div>
                      </div>
                    )}
                    <Link
                      href={`/simulado?${attempt.finishedAt ? "resultado" : "continuar"}=${attempt.id}`}
                      className="py-2 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                    >
                      {attempt.finishedAt ? "Ver resultado" : "Continuar"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
