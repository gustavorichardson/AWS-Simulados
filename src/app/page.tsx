"use client";

import React, { useState } from "react";
import { Header } from "../components/Header";
import { ExamConfigCard } from "../components/ExamConfigCard";
import { QuestionCard } from "../components/QuestionCard";
import { ExamSummary } from "../components/ExamSummary";
import { MOCK_QUESTIONS } from "../data/mockQuestions";
import {
  ExamDomain,
  EXAM_DOMAINS,
  ValidQuestionCount,
  QuestionPublicView,
  QuestionInternal,
  UserSubmission,
  ExamEvaluationResult,
} from "../types/exam";
import { sanitizeQuestions, evaluateExam } from "../lib/examEngine";
import { Info } from "lucide-react";

type PageMode = "config" | "exam" | "summary";

export default function Home() {
  const [mode, setMode] = useState<PageMode>("config");

  // Configurações
  const [questionCount, setQuestionCount] = useState<ValidQuestionCount>(15);
  const [selectedDomains, setSelectedDomains] = useState<ExamDomain[]>([...EXAM_DOMAINS]);

  // Simulado ativo
  const [activeInternalQuestions, setActiveInternalQuestions] = useState<QuestionInternal[]>([]);
  const [activeSanitizedQuestions, setActiveSanitizedQuestions] = useState<QuestionPublicView[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  // Resultado
  const [examResult, setExamResult] = useState<ExamEvaluationResult | null>(null);

  // Manipuladores de Domínios
  const handleToggleDomain = (domain: ExamDomain) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const handleSelectAllDomains = () => {
    if (selectedDomains.length === EXAM_DOMAINS.length) {
      setSelectedDomains([]);
    } else {
      setSelectedDomains([...EXAM_DOMAINS]);
    }
  };

  // Iniciar Simulado
  const handleStartExam = () => {
    // Filtra questões do dataset de acordo com os domínios selecionados
    const filtered = MOCK_QUESTIONS.filter((q) => selectedDomains.includes(q.domain));

    if (filtered.length === 0) return;

    // Embaralha para variedade
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());

    // Se o número de questões requisitado for maior que a base mock da Etapa 1,
    // preenchemos ciclicamente para permitir testar a navegação de 15, 30, 45 ou 65
    const selected: QuestionInternal[] = [];
    for (let i = 0; i < questionCount; i++) {
      const baseQ = shuffled[i % shuffled.length];
      selected.push({
        ...baseQ,
        id: `${baseQ.id}-inst-${i}`, // Garante ID único por instância na tentativa
      });
    }

    // REGRA DE SEGURANÇA: Sanitiza as questões antes de passar ao estado do exame
    const sanitized = sanitizeQuestions(selected);

    setActiveInternalQuestions(selected);
    setActiveSanitizedQuestions(sanitized);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setExamResult(null);
    setMode("exam");
  };

  // Iniciar Simulado de Recuperação
  const handleStartRecoveryExam = (recoveryTopics: string[]) => {
    const recoveryQuestions = MOCK_QUESTIONS.filter((q) =>
      recoveryTopics.includes(q.topic)
    );

    if (recoveryQuestions.length === 0) {
      handleStartExam();
      return;
    }

    const shuffled = [...recoveryQuestions].sort(() => 0.5 - Math.random());
    const count = Math.min(questionCount, Math.max(15, shuffled.length)) as ValidQuestionCount;

    const selected: QuestionInternal[] = [];
    for (let i = 0; i < count; i++) {
      const baseQ = shuffled[i % shuffled.length];
      selected.push({
        ...baseQ,
        id: `${baseQ.id}-recov-${i}`,
      });
    }

    const sanitized = sanitizeQuestions(selected);

    setActiveInternalQuestions(selected);
    setActiveSanitizedQuestions(sanitized);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setExamResult(null);
    setMode("exam");
  };

  // Selecionar Opção
  const handleSelectOption = (optionId: string) => {
    const currentQuestion = activeSanitizedQuestions[currentQuestionIndex];
    if (!currentQuestion) return;

    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  // Finalizar Simulado
  const handleFinishExam = () => {
    const submissions: UserSubmission[] = activeSanitizedQuestions.map((q) => ({
      questionId: q.id,
      selectedOptionId: userAnswers[q.id] ?? null,
    }));

    // Avaliação no servidor / motor de regras com as questões internas (que contêm o gabarito)
    const result = evaluateExam(submissions, activeInternalQuestions);
    setExamResult(result);
    setMode("summary");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header onReset={() => setMode("config")} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Aviso de Transparência da Etapa 1 */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 mb-6 flex items-start gap-3 text-xs text-amber-950">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Etapa 1 — Baseline Local & Demonstração:</span>{" "}
            Ambiente estritamente local configurado com Next.js 15, TypeScript e Vitest.
            Os dados apresentados abaixo utilizam um conjunto demonstrativo estático de questões
            curadas para o exame AWS CLF-C02. Não há chamadas a APIs pagas nem geração automática
            por IA nesta fase.
          </div>
        </div>

        {mode === "config" && (
          <ExamConfigCard
            selectedCount={questionCount}
            onCountChange={setQuestionCount}
            selectedDomains={selectedDomains}
            onToggleDomain={handleToggleDomain}
            onSelectAllDomains={handleSelectAllDomains}
            onStartExam={handleStartExam}
            availableQuestionsCount={MOCK_QUESTIONS.length}
          />
        )}

        {mode === "exam" && activeSanitizedQuestions.length > 0 && (
          <QuestionCard
            question={activeSanitizedQuestions[currentQuestionIndex]}
            currentIndex={currentQuestionIndex}
            totalQuestions={activeSanitizedQuestions.length}
            selectedOptionId={
              userAnswers[activeSanitizedQuestions[currentQuestionIndex].id] ?? null
            }
            onSelectOption={handleSelectOption}
            onPrevious={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            onNext={() =>
              setCurrentQuestionIndex((prev) =>
                Math.min(activeSanitizedQuestions.length - 1, prev + 1)
              )
            }
            onFinish={handleFinishExam}
          />
        )}

        {mode === "summary" && examResult && (
          <ExamSummary
            result={examResult}
            onNewExam={() => setMode("config")}
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
