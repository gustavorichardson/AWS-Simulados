import { loadEnvConfig } from "@next/env";
import { test, expect, Page } from "@playwright/test";

loadEnvConfig(process.cwd());

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const stamp = Date.now();
const learnerPassword = "SenhaForte#2026";

async function signUp(page: Page) {
  await page.goto("/cadastro");
  await page.getByPlaceholder(/nome/i).first().fill("Aluno sem privilégios");
  await page.locator('input[type="email"]').fill(`sem-admin.${stamp}@teste.local`);
  await page.locator('input[type="password"]').first().fill(learnerPassword);
  const confirm = page.locator('input[type="password"]').nth(1);
  if (await confirm.count()) await confirm.fill(learnerPassword);
  await page.getByRole("button", { name: /cadastr|criar/i }).click();
  await page.waitForURL("**/simulado");
}

test("usuário comum recebe 404 no painel e nas APIs administrativas", async ({ page }) => {
  await signUp(page);

  const apiResponse = await page.request.get("/api/admin/feedback/relatorio");
  expect(apiResponse.status()).toBe(404);

  const legacyApiResponse = await page.request.get("/api/feedback/relatorio");
  expect(legacyApiResponse.status()).toBe(404);

  const pageResponse = await page.goto("/admin");
  expect(pageResponse?.status()).toBe(404);
});

test("a conta configurada e semeada acessa o painel de relatórios", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "Credenciais admin locais não configuradas.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(adminEmail!);
  await page.locator('input[type="password"]').fill(adminPassword!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/simulado");

  const apiResponse = await page.request.get("/api/admin/feedback/relatorio");
  expect(apiResponse.status()).toBe(200);

  const pageResponse = await page.goto("/admin");
  expect(pageResponse?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Administração" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aprendizagem por feedback das questões" })).toBeVisible();
});
