import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { isValidQuestionCount, sanitizeQuestions } from "@/lib/examEngine";
import { generateExamQuestionsLocally } from "@/lib/question-generator";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const body = await req.json();
    const { questionCount, selectedTopics } = body;

    // 1. Validação estrita da quantidade de questões (15, 30, 45 ou 65)
    if (!isValidQuestionCount(questionCount)) {
      return NextResponse.json(
        { error: "Quantidade de questões inválida. Selecione 15, 30, 45 ou 65." },
        { status: 400 }
      );
    }

    // 2. Garante usuário válido para persistência (usuário autenticado ou guest local)
    let userId = session?.user?.id;
    if (!userId) {
      // Cria ou recupera usuário local de demonstração
      let guestUser = await prisma.user.findUnique({
        where: { email: "guest@aws-simulado.local" },
      });
      if (!guestUser) {
        guestUser = await prisma.user.create({
          data: {
            name: "Estudante Convidado",
            email: "guest@aws-simulado.local",
            profile: {
              create: {
                course: "Análise e Desenvolvimento de Sistemas (ADS)",
              },
            },
          },
        });
      }
      userId = guestUser.id;
    }

    // 3. Gera as questões a partir do repositório fictício local
    const internalQuestions = generateExamQuestionsLocally({
      count: questionCount,
      selectedTopics: selectedTopics || ["TODOS"],
    });

    // 4. Cria a tentativa no PostgreSQL local
    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        questionCount,
        selectedDomains: selectedTopics || ["TODOS"],
        isRecovery: false,
      },
    });

    // 5. REGRA CRÍTICA DE SEGURANÇA: Sanitiza as questões antes de enviar ao cliente.
    // O gabarito (correctOptionId) e a explicação NÃO são transmitidos.
    const publicQuestions = sanitizeQuestions(internalQuestions);

    return NextResponse.json({
      attemptId: attempt.id,
      questions: publicQuestions,
      certification: "AWS Certified Cloud Practitioner (CLF-C02)",
      difficulty: "Difícil",
      notice: "Conjunto de questões fictícias curadas localmente. Não gerado por IA.",
    });
  } catch (error: any) {
    console.error("Erro ao iniciar simulado:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao iniciar simulado" },
      { status: 500 }
    );
  }
}
