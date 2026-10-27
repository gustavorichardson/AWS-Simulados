import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/cadastro"];
const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

/**
 * Primeira barreira: sem cookie de sessão, páginas redirecionam para o login e APIs
 * respondem 401. A validação definitiva da sessão é feita em cada página e rota no servidor.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.get(name)?.value);
  if (!hasSessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
