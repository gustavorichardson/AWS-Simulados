# Diretrizes de Projeto: AWS Simulados (CLF-C02)

1. Nunca commitar credenciais reais ou arquivos `.env`.
2. O banco de dados é PostgreSQL local no Windows; não utilize Docker, Supabase ou provedores remotos.
3. Não envie o gabarito das questões para o navegador enquanto o simulado estiver em andamento.
4. Toda questão de simulado deve conter 4 alternativas reais + uma 5ª opção fixa `"Não sei"`.
5. Quantidades permitidas para o simulado: 15, 30, 45 ou 65 questões.
6. Classificar respostas em: Correta, Errada, "Não sei" e Não respondida.
7. Sempre rodar `npm run test` e `npm run typecheck` antes de finalizar alterações de código.
8. Mantenha a documentação e mensagens em português brasileiro (pt-BR).
