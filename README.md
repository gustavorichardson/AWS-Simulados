# ☁️ AWS Simulados — Certificação AWS Certified Cloud Practitioner (CLF-C02)

Plataforma educacional interativa de simulados para o exame **AWS Certified Cloud Practitioner (CLF-C02)**, desenvolvida com foco em aprendizado real, identificação de lacunas de conhecimento e preparação para certificação.

Projeto desenvolvido com Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, Better Auth e PostgreSQL local.

---

## 🎯 Destaques do Projeto

- **Login obrigatório:** a entrada é a página de login/cadastro; simulados, histórico e APIs só funcionam com sessão válida.
- **Modo Estudo e Modo Prova:** no Estudo, ao finalizar você vê a nota, os relatórios e a explicação de todas as questões; na Prova, somente a nota e os relatórios (sem gabarito nem explicações).
- **Opção "Não sei":** 4 alternativas reais + "Não sei", para separar dúvida de erro.
- **Tamanhos:** 15, 30, 45 ou 65 questões.
- **Sem pistas durante a prova:** o navegador recebe só enunciado, domínio e alternativas (embaralhadas por tentativa). Tópico, gabarito e explicação ficam no servidor.
- **Sem repetição:** questões já apresentadas ao usuário não voltam enquanto houver inéditas; se faltarem, novas questões são geradas, validadas contra duplicatas e pistas, e salvas no banco.
- **Relatórios:** acertos, erros, "Não sei", não respondidas, percentual, pontuação estimada, desempenho por domínio e por tópico e revisão detalhada (Modo Estudo).
- **"Gerar simulado com os tópicos em que errei":** novo simulado só com os tópicos de erro/"Não sei", sem reutilizar questões vistas.
- **Progresso salvo no servidor:** recarregar a página ou voltar pelo histórico continua o simulado.

---

## 📋 Pré-requisitos no Windows

Antes de rodar o projeto, certifique-se de que os seguintes softwares estão instalados:

1. **Node.js** (versão 20 ou superior — testado no Node.js v24.22)
2. **npm** (versão 10 ou superior)
3. **Git** (instalado em `C:\Program Files\Git`)
4. **PostgreSQL** (versão 16 ou superior — testado no PostgreSQL 18 local)

> 💡 **Dica sobre o PATH no Windows:** Se o comando `git` ou `psql` não for reconhecido no PowerShell, certifique-se de abrir um novo terminal após a instalação para recarregar as variáveis de ambiente.

---

## 🚀 Instalação e Execução

### 1. Clonar ou Acessar a Pasta do Projeto
```powershell
cd "c:\Users\gusta\OneDrive\Área de Trabalho\CURSO.EDN\projetos\awsSimulado"
```

### 2. Instalar as Dependências
```powershell
npm install
```

### 3. Configurar as Variáveis de Ambiente
Copie o arquivo de exemplo para criar o seu `.env.local`:
```powershell
Copy-Item .env.example .env.local
```
Abra `.env.local` e configure a senha do seu usuário PostgreSQL local.

### 4. Executar os Testes Automatizados
```powershell
npm run test
```

### 5. Iniciar o Servidor de Desenvolvimento
```powershell
npm run dev
```
Abra o navegador em: [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Comandos Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (`localhost:3000`) |
| `npm run test` | Testes unitários e de integração (Vitest, exige PostgreSQL local) |
| `npm run test:e2e` | Testes de navegador (Playwright) contra o build de produção — rode `npm run build` antes e, na primeira vez, `npx playwright install chromium` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` / `npm run start` | Build e execução de produção |
| `npx prisma migrate deploy` | Aplica as migrations no banco local |

---

## 🗂️ Estrutura Principal

```text
src/
├── app/
│   ├── page.tsx                  # Redireciona para /login ou /simulado
│   ├── login/, cadastro/         # Páginas públicas (redirecionam se já logado)
│   ├── simulado/page.tsx         # Configuração, prova e resultado (protegida)
│   ├── dashboard/page.tsx        # Histórico do usuário (protegida)
│   └── api/simulados/...         # iniciar, [id], progresso, finalizar, resultado, recuperacao
├── components/                   # SimuladoClient, ExamConfigCard, QuestionCard, ExamSummary, Header
├── lib/
│   ├── exam-service.ts           # Regras do simulado com verificação de posse
│   ├── question-generator.ts     # Seleção sem repetição + geração quando faltar
│   ├── question-quality.ts       # Duplicatas aproximadas e detecção de pistas
│   ├── gemini.ts                 # Geração de questões (somente servidor)
│   ├── examEngine.ts             # Sanitização e correção
│   └── api.ts, auth.ts, server-auth.ts
├── middleware.ts                 # Bloqueia páginas/APIs sem cookie de sessão
└── data/mockQuestions.ts         # Banco inicial (66 questões)
prisma/
├── schema.prisma, migrations/
└── sql/least-privilege-role.sql  # Usuário do banco com privilégios mínimos
tests/                            # Vitest (unit/integração) e tests/e2e (Playwright)
```

---

## 🔒 Segurança

1. **Gabarito protegido:** durante a prova o servidor envia apenas enunciado, domínio e alternativas. No Modo Prova, gabarito e explicações nunca são enviados, nem depois de finalizar.
2. **Isolamento entre contas:** toda consulta filtra por `userId` da sessão; simulado de outra conta responde 404. Testado em `tests/examService.test.ts`, `tests/apiRoutes.test.ts` e `tests/e2e/simulado.spec.ts`.
3. **Correção no servidor:** as questões de cada tentativa ficam gravadas no banco; IDs enviados pelo cliente não alteram a correção.
4. **Banco com privilégios mínimos:** execute `prisma/sql/least-privilege-role.sql` como dono do banco e use o usuário `aws_simulado_app` na `DATABASE_URL` da aplicação (migrations continuam com o dono).
5. **Sem segredos versionados:** `.env` e `.env.local` ficam fora do Git.

---

## ✅ Resultados da Verificação

Executados em 27/10/2026 (Ubuntu, Node 24.19, PostgreSQL local). Detalhes em `IMPLEMENTATION_PLAN.md`.

| Verificação | Resultado |
|---|---|
| `npm run test` | 11 arquivos, 56 testes aprovados (também com o usuário de privilégios mínimos) |
| `npm run test:e2e` | 3 testes de navegador aprovados |
| `npm run lint` | sem avisos nem erros |
| `npm run typecheck` | sem erros |
| `npm run build` | concluído |
