import { auth } from "@/lib/auth";
import { redactSessionToken } from "@/lib/auth-session-response";
import { toNextJsHandler } from "better-auth/next-js";
import { getServerSession } from "@/lib/server-auth";

const handlers = toNextJsHandler(auth.handler);

async function handleAuthRequest(request: Request, handler: (request: Request) => Promise<Response>) {
  const response = await handler(request);
  if (!new URL(request.url).pathname.endsWith("/get-session")) return response;
  const safeResponse = await redactSessionToken(response);
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    return safeResponse;
  }
  const body: unknown = await safeResponse.clone().json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("session" in body) ||
    !body.session
  ) {
    return safeResponse;
  }
  const session = await getServerSession();
  if (session?.user) return safeResponse;

  const headers = new Headers(safeResponse.headers);
  headers.append(
    "Set-Cookie",
    "better-auth.session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
  );
  headers.append(
    "Set-Cookie",
    "__Secure-better-auth.session_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
  );
  return new Response("null", {
    status: safeResponse.status,
    statusText: safeResponse.statusText,
    headers,
  });
}

export function GET(request: Request) {
  return handleAuthRequest(request, handlers.GET);
}

export function POST(request: Request) {
  return handleAuthRequest(request, handlers.POST);
}
