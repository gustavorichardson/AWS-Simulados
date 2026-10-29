import { NextResponse } from "next/server";
import { getServerSession } from "./server-auth";
import { ExamServiceError } from "./exam-service";

const NO_STORE = { "Cache-Control": "no-store" };

type RouteContext<P> = { params: Promise<P> };

/**
 * Envolve um handler de API exigindo sessão válida no servidor.
 * Erros internos nunca são repassados ao cliente.
 */
export function withUser<P = Record<string, string>>(
  handler: (args: { req: Request; userId: string; params: P }) => Promise<unknown>,
  successStatus = 200
) {
  return async (req: Request, context: RouteContext<P>) => {
    try {
      const session = await getServerSession();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Faça login para continuar." }, { status: 401, headers: NO_STORE });
      }
      const params = (context?.params ? await context.params : {}) as P;
      const data = await handler({ req, userId: session.user.id, params });
      return NextResponse.json(data, { status: successStatus, headers: NO_STORE });
    } catch (error) {
      if (error instanceof ExamServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
      }
      console.error("[api] erro interno:", error);
      return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500, headers: NO_STORE });
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ExamServiceError(400, "Corpo da requisição inválido.");
  }
}
