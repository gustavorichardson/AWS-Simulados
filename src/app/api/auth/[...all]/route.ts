import { auth } from "@/lib/auth";
import { redactSessionToken } from "@/lib/auth-session-response";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth.handler);

async function handleAuthRequest(request: Request, handler: (request: Request) => Promise<Response>) {
  const response = await handler(request);
  if (!new URL(request.url).pathname.endsWith("/get-session")) return response;
  return redactSessionToken(response);
}

export function GET(request: Request) {
  return handleAuthRequest(request, handlers.GET);
}

export function POST(request: Request) {
  return handleAuthRequest(request, handlers.POST);
}
