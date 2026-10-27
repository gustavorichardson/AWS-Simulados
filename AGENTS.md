# REGRAS E INSTRUÇÕES PERSISTENTES DO PROJETO AWS SIMULADOS

Este documento estabelece as diretrizes arquiteturais, de segurança, de código e de qualidade que **TODO AGENTE E DESENVOLVEDOR** deve seguir ao atuar neste repositório.

---

## 1. Contexto e Perfil do Usuário
- O projeto é uma plataforma educacional para a certificação **AWS Certified Cloud Practitioner (CLF-C02)**.
- O usuário é estudante de Análise e Desenvolvimento de Sistemas (ADS).
- Todas as soluções devem priorizar clareza, manutenibilidade e facilidade de execução local, sem camadas de complexidade desnecessária.
- Idioma padrão da comunicação, documentação e interface: **Português Brasileiro (pt-BR)**.

---

## 2. Regras de Segurança e Infraestrutura Local
1. **Ambiente estritamente local e gratuito:**
   - Proibido o uso de serviços em nuvem gerenciados pagos, Vercel, Supabase, AWS remota ou Docker nesta fase.
   - Banco de dados: **PostgreSQL instalado localmente no Windows**.
2. **Segredos e Credenciais:**
   - **NUNCA** commitar arquivos `.env` ou expor chaves de API, senhas ou tokens de banco no repositório.
   - Qualquer nova variável de ambiente obrigatória deve ser refletida em `.env.example` com placeholders neutros.
3. **Autenticação:**
   - Não inventar autenticação caseira com senhas em texto puro ou algoritmos frágeis.
   - Utilizar a biblioteca **Better Auth** configurada com adaptador para PostgreSQL.
4. **Proteção do Gabarito do Simulado (Regra Pedagógica Crítica):**
   - **NUNCA** enviar a resposta correta (`correctOptionId`, `explanation` etc.) para o frontend enquanto a prova/simulado estiver em andamento.
   - O cálculo do resultado e a verificação do acerto devem ser processados **no backend**.
   - O frontend recebe apenas o enunciado e as opções durante o simulado.

---

## 3. Regras de Negócio do Simulado AWS CLF-C02
1. **Estrutura das Questões:**
   - Toda questão deve apresentar **quatro alternativas de resposta** (A, B, C, D) + **uma quinta opção obrigatória e idêntica**: `"Não sei"`.
2. **Quantitativo de Questões:**
   - O simulado deve permitir a seleção estrita de: **15, 30, 45 ou 65 perguntas**.
3. **Seleção de Tópicos:**
   - O usuário pode selecionar um ou múltiplos domínios do exame CLF-C02 (Conceitos de Nuvem, Segurança e Conformidade, Tecnologia, Faturamento e Preços).
4. **Diferenciação de Respostas:**
   - O sistema de avaliação deve classificar e pontuar cada questão em exatamente quatro estados:
     1. `CORRETA` (ganha ponto)
     2. `ERRADA` (não ganha ponto, contabilizada como erro de conteúdo)
     3. `NAO_SEI` (não ganha ponto, mas indicada separadamente nos relatórios como lacuna de conhecimento)
     4. `NAO_RESPONDIDA` (em branco)
5. **Simulado de Recuperação:**
   - Deve ser possível gerar um simulado focado exclusivamente nos tópicos/questões em que o usuário errou ou marcou "Não sei".
6. **Ineditismo:**
   - Ao solicitar um simulado inédito, o sistema não deve reutilizar questões já apresentadas ao mesmo usuário até que o banco de questões daquele tópico seja esgotado.

---

## 4. Convenções de Código e Arquitetura
- **Framework:** Next.js (App Router) com TypeScript estrito (`strict: true`).
- **Estilização:** Tailwind CSS com paleta inspirada no ecossistema AWS (dark blue/squid, orange/smile).
- **ORM:** Prisma com schemas organizados e migrations reproduzíveis.
- **Estrutura de Pastas:**
  - `src/app/`: Rotas, páginas e APIs (App Router).
  - `src/components/`: Componentes React modulares e reutilizáveis.
  - `src/lib/`: Configurações centrais (Prisma, Auth, utilitários puros).
  - `src/types/`: Tipagens TypeScript compartilhadas.
  - `src/data/`: Datasets locais de questões simuladas para testes e modo offline.
- **Comentários e Documentação:** Explicativos e em português, mantendo a integridade de comentários existentes.

---

## 5. Obrigatoriedade de Testes Automatizados
- **SEMPRE** que houver alteração em regras de negócio, cálculos de pontuação, formatação de questões ou rotas de API:
  - Os testes existentes devem ser executados (`npm run test` e `npm run typecheck`).
  - Novos testes automatizados devem ser criados com Vitest para cobrir novos fluxos e casos de borda (edge cases).
  - Qualquer quebra de tipagem (`tsc`) ou falha de teste deve ser corrigida imediatamente antes de concluir o turno.
