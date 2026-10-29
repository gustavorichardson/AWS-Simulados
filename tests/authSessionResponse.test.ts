import { describe, expect, it } from "vitest";
import { redactSessionToken } from "../src/lib/auth-session-response";

describe("resposta da rota get-session", () => {
  it("mantém os dados públicos e remove o token da sessão", async () => {
    const response = new Response(
      JSON.stringify({
        session: {
          id: "session-id",
          token: "secret-session-token",
          expiresAt: "2026-10-29T10:00:00.000Z",
        },
        user: {
          id: "user-id",
          name: "Estudante",
          email: "estudante@example.com",
          emailVerified: true,
          password: "must-not-be-returned",
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "better-auth.session_token=opaque; HttpOnly; Path=/",
        },
      }
    );

    const sanitized = await redactSessionToken(response);
    const body = await sanitized.json();

    expect(body).toEqual({
      session: { expiresAt: "2026-10-29T10:00:00.000Z" },
      user: {
        id: "user-id",
        name: "Estudante",
        email: "estudante@example.com",
        emailVerified: true,
      },
    });
    expect(JSON.stringify(body)).not.toContain("secret-session-token");
    expect(sanitized.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("não altera respostas sem sessão nem respostas de erro", async () => {
    const empty = new Response("null", {
      headers: { "Content-Type": "application/json" },
    });
    const error = new Response("unauthorized", { status: 401 });

    expect(await (await redactSessionToken(empty)).text()).toBe("null");
    expect(await (await redactSessionToken(error)).text()).toBe("unauthorized");
  });
});
