import { test, expect, Page } from "@playwright/test";

const stamp = Date.now();
const password = "SenhaForte#2026";

async function signUp(page: Page, name: string, email: string) {
  await page.goto("/cadastro");
  await page.getByPlaceholder(/nome/i).first().fill(name);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  const confirm = page.locator('input[type="password"]').nth(1);
  if (await confirm.count()) await confirm.fill(password);
  await page.getByRole("button", { name: /cadastr|criar/i }).click();
  await page.waitForURL("**/simulado");
}

async function startExam(page: Page, mode: "estudo" | "prova") {
  const startButton = page.getByRole("button", { name: /Escolha o Modo Estudo ou o Modo Prova/ });
  await expect(startButton).toBeDisabled();
  await expect(page.getByRole("radiogroup", { name: "Dificuldade do simulado" })).toContainText(
    /Fácil.*Médio.*Difícil/s
  );
  await page.getByTestId(`modo-${mode}`).click();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/simulados/iniciar")),
    page.getByRole("button", { name: /^Iniciar Modo/ }).click(),
  ]);
  expect(response.status()).toBe(201);
  const body = await response.text();
  expect(body).not.toMatch(/correctOptionId|explanation|"topic"/);
  const parsedBody = JSON.parse(body) as {
    attemptId: string;
    difficulty: string;
    questions: { id: string; stem: string }[];
  };
  expect(parsedBody.difficulty).toBe("MEDIUM");
  await expect(page.getByText(/Questão\s*1\s*de\s*15/)).toBeVisible();
  return parsedBody;
}

async function finish(page: Page) {
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/finalizar")),
    page.getByRole("button", { name: /Sim, Finalizar Agora/ }).click(),
  ]);
  expect(response.status()).toBe(200);
  const result = await response.json();
  await page.getByRole("button", { name: "Avaliar com 5 estrelas" }).click();
  const [reviewResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/feedback")),
    page.getByRole("button", { name: "Enviar sem comentário" }).click(),
  ]);
  expect(reviewResponse.status()).toBe(200);
  return result;
}

test("visitante sem login é enviado para a página de login e as APIs recusam acesso", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/simulado");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  const res = await request.post("/api/simulados/iniciar", { data: { questionCount: 15, mode: "PROVA" } });
  expect(res.status()).toBe(401);
});

test("tema pode ser escolhido como claro, escuro ou conforme o sistema", async ({ page }) => {
  await page.goto("/login");
  const selector = page.getByLabel("Tema de exibição");

  await expect(selector).toHaveValue("system");
  await expect(selector.locator("option")).toHaveText(["Claro", "Escuro", "Sistema"]);

  await selector.selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator(".min-h-screen").first()).toHaveCSS(
    "background-color",
    "rgb(2, 6, 23)"
  );
  await selector.selectOption("light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator(".min-h-screen").first()).toHaveCSS(
    "background-color",
    "rgb(248, 250, 252)"
  );
  await selector.selectOption("system");
});

test("get-session expõe os dados permitidos e não serializa o token", async ({ page }) => {
  await signUp(page, "Aluno Sessão", `sessao.${stamp}@teste.local`);
  const session = await page.evaluate(async () => {
    const response = await fetch("/api/auth/get-session");
    return response.json();
  });

  expect(session.session).toHaveProperty("expiresAt");
  expect(session.session).not.toHaveProperty("token");
  expect(session.user).toMatchObject({
    name: "Aluno Sessão",
    email: `sessao.${stamp}@teste.local`,
    emailVerified: false,
  });
  expect(session.user).toHaveProperty("id");
});

test("Modo Prova: sem pistas durante a prova e sem gabarito/explicação no resultado", async ({ page }) => {
  await signUp(page, "Aluno Prova", `prova.${stamp}@teste.local`);
  await expect(page.getByText(/PostgreSQL|Gemini|Zod|Node\.js|Next\.js|Prisma/)).toHaveCount(0);
  const exam = await startExam(page, "prova");

  // Durante a prova: nada de dica no "Não sei", nem tópico, nem tecnologias
  await expect(page.getByText(/recuperação|Assuma a dúvida/i)).toHaveCount(0);
  await expect(page.getByText(/PostgreSQL|Gemini|Zod/)).toHaveCount(0);
  await page.getByRole("button", { name: "Não sei" }).click();
  await page.getByRole("button", { name: /Próxima/ }).click();
  await expect(page.getByText(/Questão\s*2\s*de\s*15/)).toBeVisible();
  expect(exam.questions).toHaveLength(15);

  const data = await finish(page);
  expect(JSON.stringify(data)).not.toMatch(/correctOptionId|explanation|detailedAnswers/);
  await expect(page.getByText(/% de Aproveitamento/)).toBeVisible();
  await expect(page.getByTestId("desempenho-topicos")).toBeVisible();
  await expect(page.getByTestId("aviso-modo-prova")).toBeVisible();
  await expect(page.getByTestId("revisao-detalhada")).toHaveCount(0);
  await expect(page.getByText("Explicação:")).toHaveCount(0);
  await expect(page.getByTestId("gerar-recuperacao")).toHaveText("Gerar simulado com os tópicos em que errei");
});

test("Modo Estudo: revisão detalhada com explicações; isolamento entre contas", async ({ page, browser }) => {
  await signUp(page, "Aluno Estudo", `estudo.${stamp}@teste.local`);
  const exam = await startExam(page, "estudo");
  const unknownOption = page.getByRole("checkbox", {
    name: /Não conheço o significado da alternativa A/,
  }).first();
  const [unknownResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("/api/simulados/") && response.url().includes("/progresso")
    ),
    unknownOption.check(),
  ]);
  expect(unknownResponse.status()).toBe(200);

  await page.getByLabel("Tipo de report").selectOption("REPETIDA");
  const [repeatedFeedbackResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("/api/simulados/") && response.url().endsWith("/feedback")
    ),
    page.getByRole("button", { name: "Registrar report" }).click(),
  ]);
  expect(repeatedFeedbackResponse.status()).toBe(200);
  await page.getByLabel("Tipo de report").selectOption("DIFICULDADE_INCORRETA");
  await page.getByRole("radio", { name: "Mais difícil do que deveria" }).check();
  const [difficultyFeedbackResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("/api/simulados/") && response.url().endsWith("/feedback")
    ),
    page.getByRole("button", { name: "Registrar report" }).click(),
  ]);
  expect(difficultyFeedbackResponse.status()).toBe(200);

  await page.getByRole("button", { name: "Não sei" }).click();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/simulados/") && response.url().includes("/progresso")),
    page.getByRole("button", { name: "Confirmar resposta" }).click(),
  ]);
  await expect(
    page.locator('[role="status"]').filter({ hasText: /Alternativa [A-D] —/ }).first()
  ).toContainText(/Alternativa [A-D] — (correta|incorreta)/);
  await expect(page.getByRole("button", { name: "Confirmar resposta" })).toHaveCount(0);
  const data = await finish(page);
  expect(data.result.detailedAnswers).toHaveLength(15);
  expect(data.result.unknownOptions).toHaveLength(1);
  await expect(
    page.getByRole("heading", { name: "Alternativas cujo significado você não conhece" })
  ).toBeVisible();

  const review = page.getByTestId("revisao-detalhada");
  await expect(review).toBeVisible();
  await review.locator("button[aria-expanded]").first().click();
  await expect(page.getByText("Explicação:")).toBeVisible();
  await expect(page.getByText("Gabarito", { exact: true })).toBeVisible();

  // Recuperação: inicia novo simulado com os tópicos problemáticos ou informa falta de inéditas
  await page.getByTestId("gerar-recuperacao").click();
  await expect(
    page.getByText(/Questão\s*1\s*de\s*15/).or(page.locator("main [role=alert]"))
  ).toBeVisible({ timeout: 20_000 });

  // Outra conta tenta acessar o simulado desta conta
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signUp(otherPage, "Outro Aluno", `outro.${stamp}@teste.local`);
  for (const path of [
    `/api/simulados/${exam.attemptId}`,
    `/api/simulados/${exam.attemptId}/resultado`,
    `/api/attempts/${exam.attemptId}`,
  ]) {
    const res = await otherPage.request.get(path);
    expect(res.status()).toBe(404);
  }
  const fin = await otherPage.request.post(`/api/simulados/${exam.attemptId}/finalizar`, { data: { answers: {} } });
  expect(fin.status()).toBe(404);
  const rec = await otherPage.request.post(`/api/simulados/${exam.attemptId}/recuperacao`, { data: {} });
  expect(rec.status()).toBe(404);
  const list = await otherPage.request.get("/api/attempts");
  expect((await list.json()).attempts).toHaveLength(0);
  await otherPage.goto(`/simulado?resultado=${exam.attemptId}`);
  await expect(otherPage.locator("main [role=alert]")).toContainText("Simulado não encontrado");
  await other.close();
});
