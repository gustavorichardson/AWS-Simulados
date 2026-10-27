import { NextResponse } from "next/server";
import { getServerSession, validateResourceOwnership } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id },
      include: {
        answers: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Tentativa não encontrada" }, { status: 404 });
    }

    // Regra Crítica: Impede que um usuário acesse o simulado de outro
    if (!validateResourceOwnership(attempt.userId, session.user.id)) {
      return NextResponse.json(
        { error: "Acesso negado: você não tem permissão para visualizar este simulado" },
        { status: 403 }
      );
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno ao buscar tentativa" },
      { status: 500 }
    );
  }
}
