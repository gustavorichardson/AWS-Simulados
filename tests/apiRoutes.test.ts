import { describe, it, expect, vi, beforeEach } from "vitest";

const sessionMock = vi.fn();
vi.mock("../src/lib/server-auth", () => ({ getServerSession: () => sessionMock() }));

import { POST as iniciar } from "../src/app/api/simulados/iniciar/route";
import { POST as finalizar } from "../src/app/api/simulados/[id]/finalizar/route";
import { GET as obter } from "../src/app/api/simulados/[id]/route";
import { GET as resultado } from "../src/app/api/simulados/[id]/resultado/route";
import { PATCH as progresso } from "../src/app/api/simulados/[id]/progresso/route";
import { POST as recuperacao } from "../src/app/api/simulados/[id]/recuperacao/route";
import { GET as listar } from "../src/app/api/attempts/route";

const ctx = { params: Promise.resolve({ id: "qualquer" }) };
const json = (body: unknown) =>
  new Request("http://localhost/api", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("Rotas de simulado exigem sessão válida", () => {
  beforeEach(() => sessionMock.mockResolvedValue(null));

  it("retornam 401 sem sessão e não criam nada", async () => {
    const responses = await Promise.all([
      iniciar(json({ questionCount: 15, mode: "PROVA" }), { params: Promise.resolve({}) }),
      finalizar(json({ answers: {} }), ctx),
      obter(new Request("http://localhost/api"), ctx),
      resultado(new Request("http://localhost/api"), ctx),
      progresso(json({ answers: {} }), ctx),
      recuperacao(json({}), ctx),
      listar(new Request("http://localhost/api"), { params: Promise.resolve({}) }),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(401);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    }
  });

  it("corpo inválido retorna 400 e simulado de outra conta retorna 404", async () => {
    sessionMock.mockResolvedValue({ user: { id: "usuario-sem-simulados" } });
    const bad = await iniciar(new Request("http://localhost/api", { method: "POST", body: "{" }), { params: Promise.resolve({}) });
    expect(bad.status).toBe(400);
    const other = await resultado(new Request("http://localhost/api"), ctx);
    expect(other.status).toBe(404);
  });
});
