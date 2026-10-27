import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateExam } from "@/lib/examEngine";
import { findOriginalQuestion } from "@/lib/question-generator";
import { QuestionInternal, UserSubmission } from "@/types/exam";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attemptId } = await params;
    const body = await req.json();
    const { answers, questionIds } = body as {
      answers: Record<string, string>;
      questionIds: string[];
    };

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: "Lista de identificadores de questões é obrigatória." },
        { status: 400 }
      );
    }

    // 1. Reconstitui as questões internas no servidor (que possuem o gabarito original)
    const internalQuestions: QuestionInternal[] = [];
    for (const qId of questionIds) {
      const original = findOriginalQuestion(qId);
      if (original) {
        internalQuestions.push({
          ...original,
          id: qId, // Mantém o ID da instância da tentativa
        });
      }
    }

    if (internalQuestions.length === 0) {
      return NextResponse.json(
        { error: "Não foi possível recuperar as questões do simulado no servidor." },
        { status: 404 }
      );
    }

    // 2. Converte as respostas para o formato de submissão
    const submissions: UserSubmission[] = internalQuestions.map((q) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] ?? null,
    }));

    // 3. Avalia o exame estritamente no servidor
    const evaluation = evaluateExam(submissions, internalQuestions);

    // 4. Persiste o resultado no PostgreSQL local
    try {
      await prisma.examAttempt.update({
        where: { id: attemptId },
        data: {
          percentageScore: evaluation.percentageScore,
          estimatedScaledScore: evaluation.estimatedScaledScore,
          isPassed: evaluation.isPassed,
          finishedAt: new Date(),
        },
      });

      // Atualiza ou insere as respostas do aluno
      for (const detailed of evaluation.detailedAnswers) {
        await prisma.examAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: detailed.questionId,
            },
          },
          update: {
            selectedOptionId: detailed.selectedOptionId,
            status: detailed.status,
          },
          create: {
            attemptId,
            questionId: detailed.questionId,
            selectedOptionId: detailed.selectedOptionId,
            status: detailed.status,
          },
        });
      }
    } catch (dbError) {
      console.warn("Aviso: persistência em banco local ignorada em caso de tentativa anônima:", dbError);
    }

    // 5. Retorna o resultado completo: AGORA SIM com as justificativas e gabarito liberado
    return NextResponse.json({
      result: evaluation,
      message: "Simulado finalizado e avaliado com sucesso no servidor.",
    });
  } catch (error: any) {
    console.error("Erro ao finalizar simulado:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao processar correção" },
      { status: 500 }
    );
  }
}
