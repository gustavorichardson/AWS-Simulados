"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { ExamConfigCard } from "../components/ExamConfigCard";
import { QuestionCard } from "../components/QuestionCard";
import { ExamSummary } from "../components/ExamSummary";
import {
  ValidQuestionCount,
  QuestionPublicView,
  ExamEvaluationResult,
} from "../types/exam";
import { ALL_DOMAINS_KEY } from "../lib/topic-selection";
import { Info, RotateCcw } from "lucide-react";

type PageMode = "config" | "exam" | "summary";

const STORAGE_ACTIVE_ATTEMPT_KEY = "aws_simulado_active_attempt_state";

interface StoredAttemptState {
  attemptId: string;
  questions: QuestionPublicView[];
  answers: Record<string, string>;
  markedForReview: Record<string, boolean>;
  currentIndex: number;
}

export default function Home() {
  const [mode, setMode] = useState<PageMode>("config");

  // Configurações da Prova
  const [questionCount, setQuestionCount] = useState<ValidQuestionCount>(15);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([ALL_DOMAINS_KEY]);

  // Simulado em Andamento
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionPublicView[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  // Estados de Carregamento
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Resultado
  const [examResult, setExamResult] = useState<ExamEvaluationResult | null>(null);

  // 1. Persistência do Progresso no Navegador (Local Storage)
  // Recupera tentativa pendente caso a página tenha sido recarregada
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACTIVE_ATTEMPT_KEY);
      if (stored) {
        const parsed: StoredAttemptState = JSON.parse(stored);
        if (parsed.attemptId && parsed.questions && parsed.questions.length > 0) {
          setAttemptId(parsed.attemptId);
          setQuestions(parsed.questions);
          setAnswers(parsed.answers || {});
          setMarkedForReview(parsed.markedForReview || {});
          setCurrentIndex(parsed.currentIndex || 0);
          setMode("exam");
        }
      }
    } catch (err) {
      console.warn("Falha ao recuperar progresso local:", err);
    }
  }, []);

  // Salva no Local Storage a cada alteração durante a prova
  useEffect(() => {
    if (mode === "exam" && attemptId && questions.length > 0) {
      try {
        const stateToSave: StoredAttemptState = {
          attemptId,
          questions,
          answers,
          markedForReview,
          currentIndex,
        };
        localStorage.setItem(STORAGE_ACTIVE_ATTEMPT_KEY, JSON.stringify(stateToSave));
      } catch (err) {
        console.warn("Erro ao salvar progresso local:", err);
      }
    }
  }, [mode, attemptId, questions, answers, markedForReview, currentIndex]);

  // Iniciar Novo Simulado
  const handleStartExam = async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/simulados/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionCount,
          selectedTopics,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao iniciar o simulado.");
      }

      const data = await res.json();

      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers({});
      setMarkedForReview({});
      setExamResult(null);
      setMode("exam");
    } catch (err: any) {
      setApiError(err?.message || "Ocorreu um erro ao comunicar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // Selecionar Opção
  const handleSelectOption = (optionId: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionId,
    }));
  };

  // Alternar Marcação para Revisão
  const handleToggleReview = (questionId: string) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Finalizar Simulado e Obter Gabarito no Servidor
  const handleFinishExam = async () => {
    if (!attemptId) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch(`/api/simulados/${attemptId}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          questionIds: questions.map((q) => q.id),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao processar correção do simulado.");
      }

      const data = await res.json();

      // Limpa a tentativa ativa do Local Storage
      localStorage.removeItem(STORAGE_ACTIVE_ATTEMPT_KEY);

      setExamResult(data.result);
      setMode("summary");
    } catch (err: any) {
      setApiError(err?.message || "Erro ao finalizar simulado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Descartar Prova em Andamento e Voltar à Configuração
  const handleResetToConfig = () => {
    localStorage.removeItem(STORAGE_ACTIVE_ATTEMPT_KEY);
    setAttemptId(null);
    setQuestions([]);
    setAnswers({});
    setMarkedForReview({});
    setExamResult(null);
    setMode("config");
  };

  // Simulado de Recuperação
  const handleStartRecoveryExam = async (recoveryTopics: string[]) => {
    setSelectedTopics(recoveryTopics);
    setQuestionCount(Math.min(15, questionCount) as ValidQuestionCount);
    // Inicia imediatamente com os tópicos de erro/dúvida
    setIsLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/simulados/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionCount: 15,
          selectedTopics: recoveryTopics,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao iniciar o simulado de recuperação.");
      }

      const data = await res.json();

      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers({});
      setMarkedForReview({});
      setExamResult(null);
      setMode("exam");
    } catch (err: any) {
      setApiError(err?.message || "Erro ao iniciar recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header onReset={handleResetToConfig} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Banner de Simulado Ativo / Retomar Prova */}
        {mode === "exam" && (
          <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-950">
            <span>
              <strong>Simulado em andamento:</strong> Seu progresso é salvo localmente em tempo real.
            </span>
            <button
              type="button"
              onClick={handleResetToConfig}
              className="text-amber-800 hover:text-amber-950 underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Cancelar e Voltar
            </button>
          </div>
        )}

        {apiError && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-700 font-medium">
            {apiError}
          </div>
        )}

        {mode === "config" && (
          <ExamConfigCard
            selectedCount={questionCount}
            onCountChange={setQuestionCount}
            selectedTopics={selectedTopics}
            onTopicsChange={setSelectedTopics}
            onStartExam={handleStartExam}
            isLoading={isLoading}
          />
        )}

        {mode === "exam" && questions.length > 0 && (
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
          />
        )}

        {mode === "summary" && examResult && (
          <ExamSummary
            result={examResult}
            onNewExam={handleResetToConfig}
            onStartRecoveryExam={handleStartRecoveryExam}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          AWS Simulados — Plataforma Educacional de Estudo para a Certificação AWS CLF-C02
        </p>
        <p className="mt-1">
          Executado localmente em Node.js com PostgreSQL e Next.js.
        </p>
      </footer>
    </div>
  );
}
