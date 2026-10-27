import { ExamDomain } from "./exam";

export interface DomainHierarchy {
  domain: ExamDomain;
  description: string;
  weightPercentage: number;
  subtopics: string[];
}

export const DOMAIN_HIERARCHIES: DomainHierarchy[] = [
  {
    domain: "Domínio 1: Conceitos de Nuvem",
    description: "Conceitos fundamentais de computação em nuvem, modelo econômico e arquitetura.",
    weightPercentage: 24,
    subtopics: [
      "Modelo de Responsabilidade Compartilhada",
      "Economia da Nuvem (CapEx vs OpEx)",
      "Elasticidade e Escalabilidade",
      "AWS Well-Architected Framework",
      "Infraestrutura Global da AWS",
      "Modelos de Implantação em Nuvem",
      "Benefícios da Nuvem (Agilidade e Inovação)",
    ],
  },
  {
    domain: "Domínio 2: Segurança e Conformidade",
    description: "Segurança na nuvem, governança, identidade, criptografia e proteção de dados.",
    weightPercentage: 30,
    subtopics: [
      "AWS IAM e Princípio do Menor Privilégio",
      "Security Groups e Network ACLs",
      "AWS Shield e Proteção DDoS",
      "AWS WAF (Web Application Firewall)",
      "AWS CloudTrail e Auditoria",
      "Amazon GuardDuty",
      "AWS KMS e Criptografia",
      "AWS Secrets Manager",
      "AWS Artifact e Conformidade",
      "Amazon Inspector",
      "AWS Config e Security Hub",
    ],
  },
  {
    domain: "Domínio 3: Tecnologia e Serviços de Nuvem",
    description: "Serviços essenciais de computação, armazenamento, banco de dados, redes e mensageria.",
    weightPercentage: 34,
    subtopics: [
      "Amazon S3 e Armazenamento de Objetos",
      "Amazon EC2 e Opções de Compra",
      "Computação Serverless (AWS Lambda)",
      "Amazon EBS (Armazenamento em Bloco)",
      "Amazon EFS (Sistemas de Arquivos)",
      "Bancos Relacionais (Amazon RDS e Aurora)",
      "Bancos NoSQL (Amazon DynamoDB)",
      "Redes Virtuais (Amazon VPC)",
      "Elastic Load Balancing e Route 53",
      "Contêineres (ECS, EKS e Fargate)",
      "Monitoramento com Amazon CloudWatch",
      "Serviços de Integração (SQS e SNS)",
      "Cache e Análise de Dados (ElastiCache, Redshift, Athena)",
      "Implantação e IaC (CloudFormation e Elastic Beanstalk)",
      "Migração de Dados (Família AWS Snow)",
    ],
  },
  {
    domain: "Domínio 4: Faturamento, Preços e Suporte",
    description: "Modelos de preços da AWS, planos de suporte e ferramentas de gestão de custos.",
    weightPercentage: 12,
    subtopics: [
      "AWS Budgets vs AWS Cost Explorer",
      "Planos de Suporte da AWS",
      "Faturamento Consolidado (AWS Organizations)",
      "AWS Pricing Calculator",
      "AWS Trusted Advisor",
      "AWS Free Tier",
      "Savings Plans e Instâncias Reservadas",
    ],
  },
];

/**
 * Retorna todos os subtópicos do exame agregados
 */
export function getAllSubtopics(): string[] {
  return DOMAIN_HIERARCHIES.flatMap((dh) => dh.subtopics);
}

/**
 * Encontra a qual domínio pertence determinado subtópico
 */
export function findDomainBySubtopic(subtopic: string): ExamDomain | undefined {
  const found = DOMAIN_HIERARCHIES.find((dh) =>
    dh.subtopics.some((s) => s.toLowerCase() === subtopic.toLowerCase())
  );
  return found?.domain;
}
