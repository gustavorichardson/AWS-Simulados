import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Busca apenas as tentativas pertencentes ao usuário da sessão (Isolamento de Dados)
    const attempts = await prisma.examAttempt.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        startedAt: "desc",
      },
      include: {
        answers: {
          select: {
            id: true,
            status: true,
            questionId: true,
          },
        },
      },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno ao buscar tentativas" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { questionCount, selectedDomains, isRecovery } = body;

    const newAttempt = await prisma.examAttempt.create({
      data: {
        userId: session.user.id,
        questionCount: questionCount || 15,
        selectedDomains: selectedDomains || [],
        isRecovery: !!isRecovery,
      },
    });

    return NextResponse.json({ attempt: newAttempt }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno ao registrar tentativa" },
      { status: 500 }
    );
  }
}
