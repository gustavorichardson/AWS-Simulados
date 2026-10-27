"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./Header";
import { ExamConfigCard } from "./ExamConfigCard";
import { QuestionCard } from "./QuestionCard";
import { ExamSummary } from "./ExamSummary";
import {
  ExamMode,
  ExamResultView,
  QuestionPublicView,
  ValidQuestionCount,
} from "../types/exam";
import { SelectionState, createInitialSelection, ALL_DOMAINS_KEY } from "../lib/topic-selection";
import { RotateCcw } from "lucide-react";

type View = "loading" | "config" | "exam" | "summary";

interface StoredUiState {
  attemptId: string;
  currentIndex: number;
  markedForReview: Record<string, boolean>;
}

interface StartResponse {
  attemptId: string;
  mode: ExamMode;
  questions: QuestionPublicView[];
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data as T;
}

interface SimuladoClientProps {
  userId: string;
  initialResultId: string | null;
  initialAttemptId: string | null;
}

export function SimuladoClient({ userId, initialResultId, initialAttemptId }: SimuladoClientProps) {
  const storageKey = `simulado_ativo_${userId}`;

  const [view, setView] = useState<View>("loading");
  const [questionCount, setQuestionCount] = useState<ValidQuestionCount>(15);
  const [selection, setSelection] = useState<SelectionState>(createInitialSelection());

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [examMode, setExamMode] = useState<ExamMode>("PROVA");
  const [questions, setQuestions] = useState<QuestionPublicView[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [examResult, setExamResult] = useState<ExamResultView | null>(null);

  const pendingAnswers = useRef<Record<string, string>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showResult = useCallback(async (id: string) => {
    const data = await requestJson<{ result: ExamResultView }>(`/api/simulados/${id}/resultado`);
    setExamResult(data.result);
    setAttemptId(id);
    setView("summary");
  }, []);

  const resumeAttempt = useCallback(
    async (id: string, ui?: StoredUiState) => {
      const data = await requestJson<
        | { finished: true; attemptId: string }
        | { finished: false; attemptId: string; mode: ExamMode; questions: QuestionPublicView[]; answers: Record<string, string> }
      >(`/api/simulados/${id}`);
      if (data.finished) {
        localStorage.removeItem(storageKey);
        await showResult(id);
        return;
      }
      setAttemptId(data.attemptId);
      setExamMode(data.mode);
      setQuestions(data.questions);
      setAnswers(data.answers);
      setMarkedForReview(ui?.markedForReview ?? {});
      setCurrentIndex(Math.min(ui?.currentIndex ?? 0, data.questions.length - 1));
      setView("exam");
    },
    [showResult, storageKey]
  );

  useEffect(() => {
    const load = async () => {
      try {
        if (initialResultId) return await showResult(initialResultId);
        const stored = localStorage.getItem(storageKey);
        const ui: StoredUiState | undefined = stored ? JSON.parse(stored) : undefined;
        const id = initialAttemptId ?? ui?.attemptId;
        if (id) return await resumeAttempt(id, ui?.attemptId === id ? ui : undefined);
        setView("config");
      } catch (err) {
        localStorage.removeItem(storageKey);
        setApiError(err instanceof Error ? err.message : "Erro ao carregar o simulado.");
        setView("config");
      }
    };
    load();
  }, [initialResultId, initialAttemptId, resumeAttempt, showResult, storageKey]);

  useEffect(() => {
    if (view === "exam" && attemptId) {
      const state: StoredUiState = { attemptId, currentIndex, markedForReview };
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [view, attemptId, currentIndex, markedForReview, storageKey]);

  const flushProgress = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const batch = pendingAnswers.current;
    if (!attemptId || Object.keys(batch).length === 0) return;
    pendingAnswers.current = {};
    try {
      await requestJson(`/api/simulados/${attemptId}/progresso`, {
        method: "PATCH",
        body: JSON.stringify({ answers: batch }),
      });
    } catch {
      pendingAnswers.current = { ...batch, ...pendingAnswers.current };
    }
  }, [attemptId]);

  const beginExam = (data: StartResponse) => {
    setAttemptId(data.attemptId);
    setExamMode(data.mode);
    setQuestions(data.questions);
    setCurrentIndex(0);
    setAnswers({});
    setMarkedForReview({});
    setExamResult(null);
    pendingAnswers.current = {};
    setView("exam");
    window.history.replaceState(null, "", "/simulado");
  };

  const handleStartExam = async (mode: ExamMode) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await requestJson<StartResponse>("/api/simulados/iniciar", {
        method: "POST",
        body: JSON.stringify({
          questionCount,
          mode,
          selectedTopics: selection.isAllSelected ? [ALL_DOMAINS_KEY] : selection.selectedDomains,
          selectedSubtopics: selection.isAllSelected ? [] : selection.selectedSubtopics,
        }),
      });
      beginExam(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao iniciar o simulado.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (optionId: string) => {
    const current = questions[currentIndex];
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: optionId }));
    pendingAnswers.current[current.id] = optionId;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushProgress, 800);
  };

  const handleToggleReview = (questionId: string) => {
    setMarkedForReview((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleFinishExam = async () => {
    if (!attemptId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setIsSubmitting(true);
    setApiError(null);
    try {
      const data = await requestJson<{ result: ExamResultView }>(
        `/api/simulados/${attemptId}/finalizar`,
        { method: "POST", body: JSON.stringify({ answers }) }
      );
      pendingAnswers.current = {};
      localStorage.removeItem(storageKey);
      setExamResult(data.result);
      setView("summary");
      window.scrollTo({ top: 0 });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao finalizar o simulado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToConfig = () => {
    localStorage.removeItem(storageKey);
    setAttemptId(null);
    setQuestions([]);
    setAnswers({});
    setMarkedForReview({});
    setExamResult(null);
    setApiError(null);
    setView("config");
    window.history.replaceState(null, "", "/simulado");
  };

  const handleStartRecoveryExam = async () => {
    if (!examResult) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await requestJson<StartResponse>(
        `/api/simulados/${examResult.attemptId}/recuperacao`,
        { method: "POST", body: JSON.stringify({}) }
      );
      beginExam(data);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao gerar o simulado de recuperação.");
      window.scrollTo({ top: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header onReset={view === "exam" ? undefined : handleResetToConfig} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {view === "exam" && (
          <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-950">
            <span>
              <strong>{examMode === "ESTUDO" ? "Modo Estudo" : "Modo Prova"}</strong> — suas respostas são
              salvas automaticamente.
            </span>
            <button
              type="button"
              onClick={handleResetToConfig}
              className="text-amber-800 hover:text-amber-950 underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Sair do simulado
            </button>
          </div>
        )}

        {apiError && (
          <div role="alert" className="max-w-3xl mx-auto mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-700 font-medium">
            {apiError}
          </div>
        )}

        {view === "loading" && (
          <p className="text-center text-sm text-slate-500 py-16">Carregando...</p>
        )}

        {view === "config" && (
          <ExamConfigCard
            selectedCount={questionCount}
            onCountChange={setQuestionCount}
            selection={selection}
            onSelectionChange={setSelection}
            onStartExam={handleStartExam}
            isLoading={isLoading}
          />
        )}

        {view === "exam" && questions.length > 0 && (
          <QuestionCard
            question={questions[currentIndex]}
            currentIndex={currentIndex}
            totalQuestions={questions.length}
            allQuestions={questions}
            answers={answers}
            markedForReview={markedForReview}
            onSelectOption={handleSelectOption}
            onToggleReview={handleToggleReview}
            onJumpToQuestion={(idx) => setCurrentIndex(idx)}
            onPrevious={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            onNext={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            onFinish={handleFinishExam}
            isSubmitting={isSubmitting}
            mode={examMode}
          />
        )}

        {view === "summary" && examResult && (
          <ExamSummary
            result={examResult}
            onNewExam={handleResetToConfig}
            onStartRecoveryExam={handleStartRecoveryExam}
            isRecoveryLoading={isLoading}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        AWS Simulados — Preparatório para a certificação AWS Certified Cloud Practitioner (CLF-C02)
      </footer>
    </div>
  );
}
