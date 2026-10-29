import { NextResponse } from "next/server";
import { getServerSession } from "./server-auth";
import { isAdminUser } from "./admin-auth";
import { ExamServiceError } from "./exam-service";

const NO_STORE = { "Cache-Control": "no-store" };
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const MAX_JSON_BODY_BYTES = 1_048_576;

type RouteContext<P> = { params: Promise<P> };

export function hasTrustedRequestOrigin(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  try {
    const suppliedOrigin = origin ?? (referer ? new URL(referer).origin : null);
    if (!suppliedOrigin) return true;
    const expectedOrigin = new URL(
      process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    ).origin;
    return new URL(suppliedOrigin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

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
      if (!hasTrustedRequestOrigin(req)) {
        return NextResponse.json({ error: "Origem não autorizada." }, { status: 403, headers: NO_STORE });
      }
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

export function withAdmin<P = Record<string, string>>(
  handler: (args: { req: Request; userId: string; params: P }) => Promise<unknown>,
  successStatus = 200
) {
  return async (req: Request, context: RouteContext<P>) => {
    try {
      if (!hasTrustedRequestOrigin(req)) {
        return NextResponse.json({ error: "Origem não autorizada." }, { status: 403, headers: NO_STORE });
      }
      const session = await getServerSession();
      if (!session?.user?.id || !(await isAdminUser(session.user))) {
        return NextResponse.json({ error: "Não encontrado." }, { status: 404, headers: NO_STORE });
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
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    throw new ExamServiceError(413, "Corpo da requisição excede o limite permitido.");
  }
  if (!req.body) throw new ExamServiceError(400, "Corpo da requisição inválido.");

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        throw new ExamServiceError(413, "Corpo da requisição excede o limite permitido.");
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ExamServiceError(400, "Corpo da requisição inválido.");
    }
    throw error;
  }
}
