# ☁️ AWS Simulados — Certificação AWS Certified Cloud Practitioner (CLF-C02)

Plataforma educacional interativa de simulados para o exame **AWS Certified Cloud Practitioner (CLF-C02)**, desenvolvida com foco em aprendizado real, identificação de lacunas de conhecimento e preparação para certificação.

Projeto desenvolvido com **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, **Better Auth** e **PostgreSQL local**.

---

## 🎯 Destaques do Projeto

- **Pedagogia com a Opção "Não sei":** Todas as questões trazem 4 alternativas reais (A, B, C, D) e uma 5ª opção obrigatória: `"Não sei"`. Evita o chute cego e diagnostica o que você realmente precisa estudar.
- **Tamanhos Oficiais e de Estudo:** Simulados com **15, 30, 45 ou 65 questões** (65 é o tamanho oficial da prova AWS).
- **Proteção do Gabarito:** O navegador nunca recebe as respostas corretas durante o exame. Toda validação ocorre no backend.
- **Simulado de Recuperação:** Capacidade de gerar novos simulados direcionados especificamente aos tópicos onde você errou ou teve dúvidas.
- **100% Local e Gratuito:** Roda integralmente no seu ambiente Windows, sem dependência de Docker, serviços pagos ou nuvens externas nesta fase.

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
| `npm run dev` | Inicia o servidor local Next.js em modo de desenvolvimento (`localhost:3000`) |
| `npm run test` | Executa os testes automatizados com Vitest |
| `npm run test:watch` | Executa os testes em modo interativo e contínuo |
| `npm run typecheck` | Executa a verificação estrita de tipos do TypeScript (`tsc --noEmit`) |
| `npm run build` | Compila a aplicação para produção |
| `npm run start` | Inicia a versão de produção compilada localmente |
| `npm run prisma:generate` | Gera o cliente tipado do Prisma a partir do schema |
| `npm run prisma:push` | Sincroniza o schema do Prisma com o banco PostgreSQL local |

---

## 📁 Estrutura do Repositório

```text
awsSimulado/
├── .gemini/                    # Regras locais e persistentes do assistente/agente
├── src/
│   ├── app/                    # Rotas e páginas do Next.js (App Router)
│   │   ├── layout.tsx          # Layout raiz da aplicação
│   │   ├── page.tsx            # Página inicial (Configuração e Simulado Demonstrativo)
│   │   └── globals.css         # Estilização global e Tailwind CSS
│   ├── components/             # Componentes React modulares
│   │   ├── ExamConfigCard.tsx  # Seleção de tópicos e quantidade de questões
│   │   ├── QuestionCard.tsx    # Card de questão (4 alternativas + "Não sei")
│   │   └── ExamSummary.tsx     # Demonstração de cálculo e diagnóstico pedagógico
│   ├── data/                   # Questões simuladas para demonstração e testes
│   │   └── mockQuestions.ts
│   ├── lib/                    # Regras de negócio, avaliador e utilitários
│   │   └── examEngine.ts       # Motor puro de cálculo, validação e sanitização
│   └── types/                  # Tipagens TypeScript compartilhadas
│       └── exam.ts
├── tests/                      # Suíte de testes automatizados (Vitest)
│   └── examEngine.test.ts
├── .env.example                # Template seguro de variáveis de ambiente
├── .gitignore                  # Arquivos e diretórios ignorados pelo Git
├── AGENTS.md                   # Diretrizes permanentes para agentes de IA
├── IMPLEMENTATION_PLAN.md      # Roteiro das próximas etapas do projeto
├── PROJECT_SPEC.md             # Especificação técnica e pedagógica completa
├── package.json                # Dependências e scripts do projeto
├── tsconfig.json               # Configurações do compilador TypeScript
└── vitest.config.ts            # Configuração da suíte de testes
```

---

## 🔒 Princípios de Segurança do Projeto

1. **Gabarito Seguro:** O gabarito das questões nunca é trafegado para o cliente durante uma tentativa. O estudante recebe apenas o enunciado e as alternativas.
2. **Sem Segredos Versionados:** Chaves de API e senhas de banco jamais são commitadas no Git.
3. **Sem Serviços Remotos Obrigatórios:** Todo o desenvolvimento e validação é executado localmente.
