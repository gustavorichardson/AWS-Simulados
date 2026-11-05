# AWS Simulados

Projeto de estudo para praticar conceitos da certificação AWS Certified Cloud Practitioner (CLF-C02), com simulados, histórico e identificação de lacunas de conhecimento.

Desenvolvido por Gustavo, estudante de Análise e Desenvolvimento de Sistemas, como parte de sua preparação para atuar em suporte técnico, infraestrutura e AWS. O projeto permite exercitar configuração de ambiente local, PostgreSQL, diagnóstico de falhas, controle de acesso e testes. Está em desenvolvimento e não representa experiência profissional nem comprovação de domínio full stack.

## Apoio de IA generativa

O desenvolvimento conta com apoio de IA generativa na elaboração de código, testes, documentação e diagnóstico. Esse apoio não substitui a compreensão do código, a revisão humana e a validação dos resultados. Há também uma integração opcional com Gemini para geração e triagem de questões; ela é diferente do apoio de IA usado no desenvolvimento e fica desativada quando a chave está vazia.

## Funcionalidades presentes

- Cadastro e login com Better Auth e PostgreSQL local.
- Simulados de 15, 30, 45 ou 65 questões, com seleção de domínios e subtópicos.
- Quatro alternativas e a opção "Não sei" em cada questão.
- Correção no servidor, distinguindo correta, errada, "Não sei" e não respondida.
- Modos Estudo e Prova, níveis de dificuldade, progresso salvo e histórico por conta.
- Relatórios por domínio e tópico e recuperação direcionada a erros e dúvidas.
- Seleção de questões inéditas por usuário, limitada à disponibilidade do banco local.
- Registro de problemas nas questões e área administrativa de acompanhamento de feedback.
- Tema claro e escuro.

Esses fluxos estão implementados no código e parte deles é coberta pelos testes automatizados. Isso não significa que todos os cenários da interface foram validados manualmente.

## Tecnologias

Next.js 15 (App Router), React, TypeScript estrito, Tailwind CSS, Prisma, PostgreSQL e Better Auth. Testes com Vitest e Playwright.

A aplicação e o banco funcionam localmente no Windows, sem Docker e sem necessidade de serviços pagos ou de uma conta AWS. Não há implantação em nuvem neste projeto.

## Execução local no Windows

Pré-requisitos: Git, Node.js e npm, PostgreSQL instalado e em execução. A preparação atual foi validada com Node.js 24.22.1 e npm 11.19.1. As dependências exatas estão no `package-lock.json`.

1. Abra o PowerShell na pasta do projeto e instale as dependências:

   ```powershell
   npm ci
   Copy-Item .env.example .env
   ```

   Copie o exemplo somente se ainda não tiver seu próprio `.env`. Não sobrescreva configurações existentes. O Prisma CLI lê `.env`; o Next.js também lê `.env.local`, que tem prioridade. Se ambos existirem, mantenha as configurações coerentes para não usar bancos diferentes.

2. Edite `.env` localmente:

   - `DATABASE_URL`: usuário, senha e nome do banco PostgreSQL local. Crie antes um banco vazio com esse nome pelo pgAdmin ou psql. Se a senha tiver caracteres especiais, use a codificação adequada na URL.
   - `BETTER_AUTH_SECRET`: segredo aleatório exclusivo, com pelo menos 32 caracteres. Não use o texto de exemplo.
   - `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL`: mantenha `http://localhost:3000` para execução local.
   - `GEMINI_API_KEY`: deixe vazio para não fazer chamadas externas.
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD`: necessários apenas para criar uma conta administrativa pelo seed.

3. Gere o cliente Prisma e aplique as migrations no banco local:

   ```powershell
   npm run prisma:generate
   npx prisma migrate deploy
   ```

   As migrations devem ser aplicadas com o dono do banco. O script `prisma/sql/least-privilege-role.sql` permite preparar um usuário com privilégios menores para a aplicação; leia suas instruções antes de executar. O banco inicial de questões é carregado pelo serviço ao selecionar questões, não pelo seed administrativo.

4. Inicie a aplicação:

   ```powershell
   npm run dev
   ```

   Acesse [localhost:3000](http://localhost:3000), crie uma conta e comece um simulado. Sem geração externa, a disponibilidade varia conforme os filtros e as questões já vistas. Se faltarem questões inéditas, a aplicação informa a limitação.

5. Opcionalmente, após configurar as credenciais administrativas locais:

   ```powershell
   npx prisma db seed
   ```

   Esse comando cria ou atualiza a conta administrativa e invalida suas sessões anteriores. Não é necessário para o uso comum.

## Validação

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

Os testes de integração usam PostgreSQL real e criam/excluem registros de teste. Use um banco local dedicado a testes, com as migrations aplicadas, sem dados importantes. A integração Gemini é simulada nos testes; sua execução não comprova a qualidade de respostas de um serviço externo.

Para os testes de navegador, prepare o build e o Chromium:

```powershell
npx playwright install chromium
npm run build
npm run test:e2e
```

O Playwright inicia o servidor na porta 3000, que precisa estar livre. Os testes administrativos dependem da conta configurada nas variáveis de ambiente e criada pelo seed.

## Limitações e próximos passos

- Projeto educacional independente, sem vínculo ou aprovação da AWS. Questões e explicações precisam de revisão técnica; a nota estimada não equivale à pontuação oficial nem garante aprovação.
- O banco local é finito. Não é possível garantir todos os tamanhos, dificuldades e filtros sem conteúdo suficiente. A recuperação também depende dessa disponibilidade.
- **Regra de negócio formalizada:**
  - No Modo Prova, o sistema não revela o gabarito nem as explicações antes da finalização do simulado.
  - No Modo Estudo, após a confirmação da resposta, o usuário recebe feedback e explicações daquela questão para fins pedagógicos, conforme o comportamento já implementado.
  - Essa distinção entre os modos está refletida nos testes e no fluxo do produto e não deve ser tratada como falha de segurança, mas como regra de aprendizagem intencional.
- A integração Gemini existente faz chamadas a um serviço externo se uma chave válida estiver configurada. Ela fica fora do modo estritamente local; mantenha a chave vazia nesta fase. Geração e triagem automática não garantem correção pedagógica e não treinam um modelo.
- Não há fluxo de recuperação de senha configurado com envio de e-mail. Uso público, hospedagem e operação em produção não foram validados nesta preparação.
- Próximos passos: corrigir a divergência do Modo Estudo, revisar o conteúdo local e testar uma instalação do zero e os fluxos completos no navegador.

## Organização

- `src/app/`: páginas e rotas de API.
- `src/components/`: componentes da interface.
- `src/lib/`: autenticação, seleção, correção e persistência.
- `src/data/`: questões locais.
- `src/types/`: tipos compartilhados.
- `prisma/`: schema, migrations e seed administrativo.
- `tests/`: testes unitários, de integração e de navegador.

`PROJECT_SPEC.md` e `IMPLEMENTATION_PLAN.md` registram o planejamento original e podem conter etapas ou descrições antigas. Consulte o código e os testes para conferir o comportamento atual.

## Cuidados antes de compartilhar

Nunca publique `.env`, `.env.local`, chaves, senhas, dumps do banco ou dados reais de usuários. `.env.example` contém somente referências para configuração. O `.gitignore` ajuda a evitar inclusões acidentais, mas não remove dados já presentes no histórico.

O histórico local existente foi preservado nesta preparação. Ele contém metadados de autoria dos commits e referências antigas ao caminho local de desenvolvimento. Revise esses metadados antes de tornar o histórico público. O destino no GitHub ainda precisa ser combinado; não há publicação automática.
