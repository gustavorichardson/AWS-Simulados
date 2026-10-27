-- ============================================================================
-- Usuário do banco com privilégios mínimos para a aplicação em execução.
-- As migrations continuam sendo aplicadas pelo usuário dono do banco.
--
-- Uso (como dono do banco):
--   psql -d aws_simulado_db -v app_password='SUA_SENHA_FORTE' -f prisma/sql/least-privilege-role.sql
-- Depois, use este usuário na DATABASE_URL da aplicação:
--   postgresql://aws_simulado_app:SUA_SENHA_FORTE@localhost:5432/aws_simulado_db?schema=public
-- ============================================================================

SELECT format('CREATE ROLE aws_simulado_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aws_simulado_app') \gexec

ALTER ROLE aws_simulado_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE aws_simulado_db FROM PUBLIC;
GRANT CONNECT ON DATABASE aws_simulado_db TO aws_simulado_app;
GRANT USAGE ON SCHEMA public TO aws_simulado_app;

-- Somente leitura/escrita de dados: sem CREATE, DROP, ALTER ou TRUNCATE
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aws_simulado_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aws_simulado_app;
REVOKE ALL ON TABLE public._prisma_migrations FROM aws_simulado_app;

-- Tabelas criadas por migrations futuras recebem as mesmas permissões
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aws_simulado_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO aws_simulado_app;
