import { describe, expect, it } from "vitest";
import { hasConfiguredAdminIdentity } from "../src/lib/admin-auth";

describe("Autorização administrativa", () => {
  it("permite apenas o papel ADMIN com o e-mail configurado", () => {
    expect(
      hasConfiguredAdminIdentity(
        { email: " ADMIN@example.local ", role: "ADMIN" },
        "admin@example.local"
      )
    ).toBe(true);
    expect(
      hasConfiguredAdminIdentity(
        { email: "admin@example.local", role: "USER" },
        "admin@example.local"
      )
    ).toBe(false);
    expect(
      hasConfiguredAdminIdentity(
        { email: "other@example.local", role: "ADMIN" },
        "admin@example.local"
      )
    ).toBe(false);
    expect(
      hasConfiguredAdminIdentity({ email: "admin@example.local", role: "ADMIN" }, undefined)
    ).toBe(false);
  });
});
