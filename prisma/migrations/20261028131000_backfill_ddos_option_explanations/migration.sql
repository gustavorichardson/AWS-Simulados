UPDATE "questions"
SET "optionExplanations" = '{
  "opt_a": "AWS Shield Standard oferece proteção automática contra ataques DDoS comuns nas camadas 3 e 4, sem custo adicional.",
  "opt_b": "AWS Shield Advanced oferece proteções adicionais e recursos avançados, mas é um serviço pago que exige ativação.",
  "opt_c": "AWS WAF ajuda a filtrar tráfego HTTP e HTTPS na camada de aplicação; não substitui a proteção automática contra DDoS de rede do Shield Standard.",
  "opt_d": "Amazon Inspector avalia vulnerabilidades em workloads; não oferece proteção contra ataques DDoS."
}'::jsonb
WHERE "id" = 'clf-d2-004'
  AND "optionExplanations" IS NULL;
