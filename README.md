# ☁️ AWS Simulados — Certificação AWS Certified Cloud Practitioner (CLF-C02)

Plataforma educacional interativa de simulados para o exame **AWS Certified Cloud Practitioner (CLF-C02)**, desenvolvida com foco em aprendizado real, identificação de lacunas de conhecimento e preparação para certificação.

Projeto desenvolvido com Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, Better Auth e PostgreSQL local.

---

## 🎯 Destaques do Projeto

- **Login obrigatório:** a entrada é a página de login/cadastro; simulados, histórico e APIs só funcionam com sessão válida.
- **Modo Estudo e Modo Prova:** no Estudo, confirme cada resposta para ver na hora se acertou, qual era a alternativa correta e a explicação; ao finalizar, veja também a nota e os relatórios. Na Prova, veja somente a nota e os relatórios (sem gabarito nem explicações).
- **Opção "Não sei":** 4 alternativas reais + "Não sei", para separar dúvida de erro.
- **Tamanhos:** 15, 30, 45 ou 65 questões.
- **Dificuldade configurável:** Fácil, Médio ou Difícil. A geração por IA permanece sempre dentro do escopo oficial e do nível Cloud Practitioner; no nível Difícil, as alternativas exibem apenas nomes/respostas, sem contexto adicional.
- **Estrutura de dificuldade distinta:** Fácil valida enunciados de 6 a 35 palavras com palavra-chave AWS; Médio valida cenários de 25 a 85 palavras e alternativas concisas; Difícil valida cenários de arquitetura de 45 a 160 palavras e alternativas sem frases explicativas. O backend também verifica estrutura, quantidade de alternativas e resposta correta.
- **Feedback por alternativa no Modo Estudo:** após confirmar, cada alternativa recebe sua própria justificativa vinculada ao identificador A/B/C/D, evitando trocar o motivo da opção escolhida pelo da resposta correta.
- **Alternativas desconhecidas:** marque independentemente quais opções ainda não conhece; elas ficam associadas à questão/conceito no relatório e não interferem na resposta nem na nota.
- **Feedback e avaliação:** no Modo Estudo, reporte questão errada (classificando enunciado ou resposta), repetida, dificuldade inadequada ou resposta viciada. Ao concluir, avalie o simulado com estrelas e comentário opcional.
- **Triagem auditável:** os reports são registrados, deduplicados e analisados pela IA antes de serem usados em gerações futuras. Feedbacks ambíguos ficam aguardando validação; nenhuma questão é alterada automaticamente. O modelo não é considerado treinado.
- **Monitoramento da geração por feedback:** o dashboard separa registros únicos, duplicatas, aprovados, pendentes, uso em prompts, questões geradas e correções editoriais realmente registradas. Resolução exige evidência de exposição posterior; o histórico diário fica persistido.
- **Sem pistas durante a prova:** o navegador recebe só enunciado, domínio e alternativas (embaralhadas por tentativa). Tópico, gabarito e explicação ficam no servidor.
- **Sem repetição:** questões já apresentadas ao usuário não voltam enquanto houver inéditas; se faltarem, novas questões são geradas, validadas contra duplicatas e pistas, e salvas no banco.
- **Relatórios:** acertos, erros, "Não sei", não respondidas, percentual, pontuação estimada, desempenho por domínio e por tópico e revisão detalhada (Modo Estudo).
- **Seleção de subtópicos:** simulados direcionados dividem as questões em 50% com resposta correta nos subtópicos selecionados e 50% em outros subtópicos do mesmo domínio; totais ímpares arredondam a metade selecionada para cima. A lista é embaralhada no servidor. Se faltar conteúdo para cumprir a proporção, a API informa a impossibilidade.
- **"Gerar simulado com os tópicos em que errei":** mantém o fluxo de recuperação existente, com pelo menos 40% das questões diretamente nos subtópicos fracos e o restante no mesmo domínio.
- **Tema escuro:** preferência de tema claro/escuro/sistema via `next-themes`, com paleta Slate e suporte a hidratação no layout raiz.
- **Progresso salvo no servidor:** recarregar a página ou voltar pelo histórico continua o simulado.
- **Expiração de sessão:** sessão inválida por inatividade (30 minutos por padrão) ou por validade máxima (7 dias), verificada no servidor. Os limites podem ser ajustados com `AUTH_SESSION_IDLE_MINUTES` e `AUTH_SESSION_MAX_DAYS`.

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

### 4. Aplicar as Migrations no PostgreSQL Local
```powershell
npx prisma migrate deploy
```

### 5. Executar os Testes Automatizados
```powershell
npm run test
```

### 6. Iniciar o Servidor de Desenvolvimento
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
│   ├── dashboard/page.tsx        # Histórico e relatório de feedback (protegida)
│   └── api/                      # simulados e relatório de feedback
├── components/                   # UI do simulado, resultado e monitoramento
├── lib/
│   ├── exam-service.ts           # Regras do simulado com verificação de posse
│   ├── question-generator.ts     # Seleção sem repetição + geração quando faltar
│   ├── question-quality.ts       # Duplicatas aproximadas e detecção de pistas
│   ├── gemini.ts                 # Geração de questões (somente servidor)
│   ├── examEngine.ts             # Sanitização e correção
│   ├── feedback-report.ts        # Métricas observadas e snapshots diários
│   ├── session-policy.ts         # Limites de inatividade e validade máxima
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
