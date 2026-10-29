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
  QuestionDifficulty,
  StudyFeedback,
  StudyQuestionFeedbackState,
  StudyFeedbackCategory,
  DifficultyDirection,
  FeedbackIssueLocation,
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
  difficulty: QuestionDifficulty;
  questions: QuestionPublicView[];
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    window.location.href = "/login?motivo=sessao-expirada";
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
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("MEDIUM");
  const [selection, setSelection] = useState<SelectionState>(createInitialSelection());

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [examMode, setExamMode] = useState<ExamMode>("PROVA");
  const [questions, setQuestions] = useState<QuestionPublicView[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [studyFeedback, setStudyFeedback] = useState<Record<string, StudyFeedback>>({});
  const [unknownOptions, setUnknownOptions] = useState<Record<string, string[]>>({});
  const [questionFeedback, setQuestionFeedback] = useState<
    Record<string, StudyQuestionFeedbackState>
  >({});
  const [isConfirmingAnswer, setIsConfirmingAnswer] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [examResult, setExamResult] = useState<ExamResultView | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSavingReview, setIsSavingReview] = useState(false);

  const pendingAnswers = useRef<Record<string, string>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unknownSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const unknownOptionsRef = useRef(unknownOptions);

  const showResult = useCallback(async (id: string) => {
    const data = await requestJson<{ result: ExamResultView }>(`/api/simulados/${id}/resultado`);
    setExamResult(data.result);
    setShowReviewModal(!data.result.review);
    setAttemptId(id);
    setView("summary");
  }, []);

  const resumeAttempt = useCallback(
    async (id: string, ui?: StoredUiState) => {
      const data = await requestJson<
        | { finished: true; attemptId: string }
        | {
            finished: false;
            attemptId: string;
            mode: ExamMode;
            difficulty: QuestionDifficulty;
            questions: QuestionPublicView[];
            answers: Record<string, string>;
            studyFeedback?: Record<string, StudyFeedback>;
            unknownOptions?: Record<string, string[]>;
            questionFeedback?: Record<string, StudyQuestionFeedbackState>;
          }
      >(`/api/simulados/${id}`);
      if (data.finished) {
        localStorage.removeItem(storageKey);
        await showResult(id);
        return;
      }
      setAttemptId(data.attemptId);
      setExamMode(data.mode);
      setDifficulty(data.difficulty);
      setQuestions(data.questions);
      setAnswers(data.answers);
      setStudyFeedback(data.studyFeedback ?? {});
      setUnknownOptions(data.unknownOptions ?? {});
      unknownOptionsRef.current = data.unknownOptions ?? {};
      setQuestionFeedback(data.questionFeedback ?? {});
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
    setDifficulty(data.difficulty);
    setQuestions(data.questions);
    setCurrentIndex(0);
    setAnswers({});
    setStudyFeedback({});
    setUnknownOptions({});
    unknownOptionsRef.current = {};
    setQuestionFeedback({});
    setIsConfirmingAnswer(false);
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
          difficulty,
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
    if (examMode === "ESTUDO") {
      if (studyFeedback[current.id]) return;
      setAnswers((prev) => ({ ...prev, [current.id]: optionId }));
      return;
    }
    setAnswers((prev) => ({ ...prev, [current.id]: optionId }));
    pendingAnswers.current[current.id] = optionId;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushProgress, 800);
  };

  const handleConfirmStudyAnswer = async () => {
    const current = questions[currentIndex];
    const selectedOptionId = current ? answers[current.id] : undefined;
    if (!attemptId || !current || !selectedOptionId || studyFeedback[current.id] || isConfirmingAnswer) return;

    setIsConfirmingAnswer(true);
    setApiError(null);
    try {
      const data = await requestJson<{ studyFeedback?: Record<string, StudyFeedback> }>(
        `/api/simulados/${attemptId}/progresso`,
        {
          method: "PATCH",
          body: JSON.stringify({ answers: { [current.id]: selectedOptionId } }),
        }
      );
      const feedback = data.studyFeedback?.[current.id];
      if (!feedback) throw new Error("Não foi possível carregar a explicação desta resposta.");
      setStudyFeedback((prev) => ({ ...prev, [current.id]: feedback }));
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao confirmar a resposta.");
    } finally {
      setIsConfirmingAnswer(false);
    }
  };

  const handleToggleReview = (questionId: string) => {
    setMarkedForReview((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleToggleUnknownOption = (questionId: string, optionId: string) => {
    if (!attemptId) return;
    const next = new Set(unknownOptionsRef.current[questionId] ?? []);
    if (next.has(optionId)) next.delete(optionId);
    else next.add(optionId);
    const values = [...next];
    const nextState = { ...unknownOptionsRef.current, [questionId]: values };
    unknownOptionsRef.current = nextState;
    setUnknownOptions(nextState);
    setApiError(null);
    unknownSaveQueue.current = unknownSaveQueue.current
      .catch(() => undefined)
      .then(async () => {
        await requestJson(`/api/simulados/${attemptId}/progresso`, {
          method: "PATCH",
          body: JSON.stringify({ unknownOptions: { [questionId]: values } }),
        });
      })
      .catch((error) => {
        setApiError(error instanceof Error ? error.message : "Não foi possível salvar as marcações.");
      });
  };

  const handleQuestionFeedback = async (
    questionId: string,
    category: StudyFeedbackCategory,
    active: boolean,
    difficultyDirection?: DifficultyDirection,
    details?: {
      issueLocation?: FeedbackIssueLocation;
      reportedAnswer?: string;
      detail?: string;
    }
  ) => {
    if (!attemptId) return;
    setApiError(null);
    try {
      await requestJson(`/api/simulados/${attemptId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          questionId,
          category,
          active,
          difficultyDirection,
          ...details,
        }),
      });
      setQuestionFeedback((previous) => {
        const next = { ...previous[questionId] };
        if (!active) delete next[category];
        else next[category] = category === "DIFICULDADE_INCORRETA"
          ? difficultyDirection ?? "MAIS_FACIL"
          : true;
        return { ...previous, [questionId]: next };
      });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Não foi possível salvar o feedback.");
    }
  };

  const handleFinishExam = async () => {
    if (!attemptId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setIsSubmitting(true);
    setApiError(null);
    try {
      if (examMode === "ESTUDO" && Object.keys(unknownOptions).length > 0) {
        await unknownSaveQueue.current;
        await requestJson(`/api/simulados/${attemptId}/progresso`, {
          method: "PATCH",
          body: JSON.stringify({ unknownOptions }),
        });
      }
      const data = await requestJson<{ result: ExamResultView }>(
        `/api/simulados/${attemptId}/finalizar`,
        {
          method: "POST",
          body: JSON.stringify({
            answers:
              examMode === "ESTUDO"
                ? Object.fromEntries(
                    Object.keys(studyFeedback).map((questionId) => [questionId, answers[questionId]])
                  )
                : answers,
          }),
        }
      );
      pendingAnswers.current = {};
      localStorage.removeItem(storageKey);
      setExamResult(data.result);
      setShowReviewModal(!data.result.review);
      setReviewRating(data.result.review?.rating ?? 0);
      setReviewComment(data.result.review?.comment ?? "");
      setView("summary");
      window.scrollTo({ top: 0 });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao finalizar o simulado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveReview = async (includeComment: boolean) => {
    if (!attemptId || reviewRating === 0) return;
    setIsSavingReview(true);
    setApiError(null);
    try {
      await requestJson(`/api/simulados/${attemptId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          type: "AVALIACAO_SIMULADO",
          review: {
            rating: reviewRating,
            ...(includeComment && reviewComment.trim()
              ? { comment: reviewComment.trim() }
              : {}),
          },
        }),
      });
      setExamResult((result) =>
        result
          ? {
              ...result,
              review: {
                rating: reviewRating,
                comment: includeComment ? reviewComment.trim() || null : null,
              },
            }
          : result
      );
      setShowReviewModal(false);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Não foi possível salvar a avaliação.");
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleResetToConfig = () => {
    localStorage.removeItem(storageKey);
    setAttemptId(null);
    setQuestions([]);
    setAnswers({});
    setStudyFeedback({});
    setUnknownOptions({});
    unknownOptionsRef.current = {};
    unknownOptionsRef.current = {};
    setQuestionFeedback({});
    setIsConfirmingAnswer(false);
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
              <strong>{examMode === "ESTUDO" ? "Modo Estudo" : "Modo Prova"}</strong> —{" "}
              {examMode === "ESTUDO"
                ? "confirme cada resposta para ver a explicação."
                : "suas respostas são salvas automaticamente."}
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
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
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
            studyFeedback={studyFeedback}
            unknownOptions={unknownOptions}
            questionFeedback={questionFeedback}
            isConfirmingAnswer={isConfirmingAnswer}
            markedForReview={markedForReview}
            onSelectOption={handleSelectOption}
            onConfirmStudyAnswer={handleConfirmStudyAnswer}
            onToggleUnknownOption={handleToggleUnknownOption}
            onQuestionFeedback={handleQuestionFeedback}
            onToggleReview={handleToggleReview}
            onJumpToQuestion={(idx) => setCurrentIndex(idx)}
            onPrevious={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            onNext={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            onFinish={handleFinishExam}
            isSubmitting={isSubmitting}
            mode={examMode}
            difficulty={difficulty}
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

      {showReviewModal && view === "summary" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-review-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="exam-review-title" className="text-lg font-bold text-slate-900">
              Como foi este simulado?
            </h2>
            <p className="mt-1 text-sm text-slate-600">Sua avaliação ajuda a acompanhar a qualidade das questões.</p>
            <div className="mt-4 flex gap-2" role="group" aria-label="Avaliação de uma a cinco estrelas">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  aria-label={`Avaliar com ${rating} ${rating === 1 ? "estrela" : "estrelas"}`}
                  aria-pressed={reviewRating === rating}
                  onClick={() => setReviewRating(rating)}
                  className={`text-3xl leading-none ${
                    rating <= reviewRating ? "text-amber-500" : "text-slate-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Justificativa (opcional)
              <textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                maxLength={2000}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={reviewRating === 0 || isSavingReview}
                onClick={() => handleSaveReview(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                {isSavingReview ? "Salvando..." : "Enviar sem comentário"}
              </button>
              <button
                type="button"
                disabled={reviewRating === 0 || isSavingReview}
                onClick={() => handleSaveReview(true)}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {isSavingReview ? "Salvando..." : "Enviar avaliação"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
