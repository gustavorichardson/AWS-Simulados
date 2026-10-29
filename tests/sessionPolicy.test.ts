import { describe, expect, it } from "vitest";
import { isSessionExpired } from "../src/lib/session-policy";

const now = new Date("2026-10-29T15:00:00.000Z");
const policy = { idleTimeoutMs: 30 * 60_000, maximumLifetimeMs: 7 * 24 * 60 * 60_000 };

describe("política de expiração de sessão", () => {
  it("mantém uma sessão dentro dos limites de inatividade e validade máxima", () => {
    expect(
      isSessionExpired(
        {
          createdAt: new Date("2026-10-29T10:00:00.000Z"),
          updatedAt: new Date("2026-10-29T14:45:00.000Z"),
          expiresAt: new Date("2026-10-30T10:00:00.000Z"),
        },
        now,
        policy
      )
    ).toBe(false);
  });

  it("expira por inatividade mesmo que expiresAt ainda esteja no futuro", () => {
    expect(
      isSessionExpired(
        {
          createdAt: new Date("2026-10-29T10:00:00.000Z"),
          updatedAt: new Date("2026-10-29T14:29:00.000Z"),
          expiresAt: new Date("2026-10-30T10:00:00.000Z"),
        },
        now,
        policy
      )
    ).toBe(true);
  });

  it("expira a validade máxima mesmo com atividade recente", () => {
    expect(
      isSessionExpired(
        {
          createdAt: new Date("2026-10-22T14:59:00.000Z"),
          updatedAt: new Date("2026-10-29T14:59:30.000Z"),
          expiresAt: new Date("2026-10-30T14:59:00.000Z"),
        },
        now,
        policy
      )
    ).toBe(true);
  });
});
