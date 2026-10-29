import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/cadastro"];
const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

/**
 * Primeira barreira: sem cookie de sessão, páginas redirecionam para o login e APIs
 * respondem 401. A validação definitiva da sessão é feita em cada página e rota no servidor.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));
  const isDevelopment = process.env.NODE_ENV !== "production";
  const connectSources = isDevelopment ? " 'self' ws://localhost:* ws://127.0.0.1:*" : " 'self'";
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ].join(" ");
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSources}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src${connectSources}`,
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  requestHeaders.set("x-nonce", nonce);

  const response = (headers?: Headers) => {
    const nextResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    nextResponse.headers.set("Content-Security-Policy", contentSecurityPolicy);
    if (headers) {
      headers.forEach((value, key) => nextResponse.headers.set(key, value));
    }
    if (pathname.startsWith("/admin")) {
      nextResponse.headers.set("Cache-Control", "private, no-store, max-age=0");
    }
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ENABLE_HSTS === "true"
    ) {
      nextResponse.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }
    return nextResponse;
  };

  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/auth")) {
    return response();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) {
    return response();
  }

  if (pathname === "/api/feedback/relatorio") {
    const notFound = NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    notFound.headers.set("Content-Security-Policy", contentSecurityPolicy);
    notFound.headers.set("Cache-Control", "no-store");
    return notFound;
  }

  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.get(name)?.value);
  if (!hasSessionCookie) {
    if (pathname.startsWith("/api/")) {
      const unauthorized = NextResponse.json(
        { error: "Faça login para continuar." },
        { status: 401 }
      );
      unauthorized.headers.set("Content-Security-Policy", contentSecurityPolicy);
      unauthorized.headers.set("Cache-Control", "no-store");
      return unauthorized;
    }
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    redirect.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return redirect;
  }
  return response();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
