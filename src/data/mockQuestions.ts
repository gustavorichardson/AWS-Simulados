import { QuestionInternal } from "../types/exam";

export const MOCK_QUESTIONS: QuestionInternal[] = [
  // DOMÍNIO 1: CONCEITOS DE NUVEM
  {
    id: "q-d1-01",
    domain: "Domínio 1: Conceitos de Nuvem",
    topic: "Modelo de Responsabilidade Compartilhada",
    stem: "De acordo com o Modelo de Responsabilidade Compartilhada da AWS, qual das seguintes tarefas é de responsabilidade EXCLUSIVA do cliente ao utilizar instâncias do Amazon EC2?",
    options: [
      { id: "opt_a", text: "Manutenção e substituição do hardware dos servidores físicos." },
      { id: "opt_b", text: "Atualização e aplicação de patches no sistema operacional da instância." },
      { id: "opt_c", text: "Segurança física das instalações dos Data Centers da AWS." },
      { id: "opt_d", text: "Destruição segura de discos magnéticos e memórias danificados da AWS." },
    ],
    correctOptionId: "opt_b",
    explanation:
      "No Amazon EC2 (IaaS), a AWS é responsável pela segurança 'da' nuvem (hardware, data centers, hipervisor). O cliente é responsável pela segurança 'na' nuvem, o que inclui a configuração e instalação de patches no sistema operacional convidado.",
    documentationUrl: "https://aws.amazon.com/compliance/shared-responsibility-model/",
  },
  {
    id: "q-d1-02",
    domain: "Domínio 1: Conceitos de Nuvem",
    topic: "Economia e Vantagens da Nuvem",
    stem: "Qual vantagem da computação em nuvem permite que uma empresa deixe de estimar a capacidade futura de infraestrutura e ajuste seus recursos computacionais sob demanda para cima ou para baixo?",
    options: [
      { id: "opt_a", text: "Elasticidade." },
      { id: "opt_b", text: "Alta Latência." },
      { id: "opt_c", text: "Despesa de Capital Fixa (CapEx)." },
      { id: "opt_d", text: "Isolamento Físico de Hardware." },
    ],
    correctOptionId: "opt_a",
    explanation:
      "Elasticidade é a capacidade de alocar e desalocar recursos de computação dinamicamente à medida que a demanda varia, eliminando o risco de subprovisionamento ou superprovisionamento.",
  },
  {
    id: "q-d1-03",
    domain: "Domínio 1: Conceitos de Nuvem",
    topic: "Well-Architected Framework",
    stem: "Uma startup deseja projetar suas cargas de trabalho na AWS para recuperar-se automaticamente de falhas e interrupções de serviço. Qual pilar do AWS Well-Architected Framework enfatiza esse objetivo?",
    options: [
      { id: "opt_a", text: "Otimização de Custos." },
      { id: "opt_b", text: "Confiabilidade (Reliability)." },
      { id: "opt_c", text: "Sustentabilidade." },
      { id: "opt_d", text: "Eficiência de Performance." },
    ],
    correctOptionId: "opt_b",
    explanation:
      "O pilar Confiabilidade (Reliability) abrange a capacidade de uma carga de trabalho executar sua função pretendida de forma correta e consistente, incluindo a recuperação ágil após panes.",
  },

  // DOMÍNIO 2: SEGURANÇA E CONFORMIDADE
  {
    id: "q-d2-01",
    domain: "Domínio 2: Segurança e Conformidade",
    topic: "Gerenciamento de Identidade e Acesso (IAM)",
    stem: "Qual prática de segurança do AWS Identity and Access Management (IAM) recomenda conceder aos colaboradores apenas as permissões estritamente necessárias para a execução de seus deveres funcionais?",
    options: [
      { id: "opt_a", text: "Princípio do Privilégio Mínimo (Least Privilege)." },
      { id: "opt_b", text: "Acesso com Credenciais de Usuário Raiz (Root User)." },
      { id: "opt_c", text: "Compartilhamento de Chaves de Acesso Programáticas." },
      { id: "opt_d", text: "Permissão de Acesso Aberto (Full AdministratorAccess)." },
    ],
    correctOptionId: "opt_a",
    explanation:
      "O princípio do privilégio mínimo estabelece que usuários e serviços devem receber apenas as autorizações indispensáveis para executar suas atividades, minimizando os riscos de segurança.",
  },
  {
    id: "q-d2-02",
    domain: "Domínio 2: Segurança e Conformidade",
    topic: "Firewalls e Redes Virtuais",
    stem: "Em relação aos controles de segurança de rede da Amazon VPC, qual recurso opera no nível de instância e mantém estado (é 'stateful'), permitindo automaticamente o tráfego de retorno?",
    options: [
      { id: "opt_a", text: "Lista de Controle de Acesso de Rede (Network ACL)." },
      { id: "opt_b", text: "Grupo de Segurança (Security Group)." },
      { id: "opt_c", text: "Tabela de Rotas da VPC." },
      { id: "opt_d", text: "Internet Gateway (IGW)." },
    ],
    correctOptionId: "opt_b",
    explanation:
      "Security Groups operam no nível de interface de rede da instância e são stateful: qualquer tráfego de entrada permitido terá sua resposta de saída autorizada automaticamente.",
  },
  {
    id: "q-d2-03",
    domain: "Domínio 2: Segurança e Conformidade",
    topic: "Proteção contra Ataques de Negação de Serviço",
    stem: "Qual serviço gerenciado da AWS fornece proteção nativa e contínua contra ataques de negação de serviço distribuído (DDoS) para aplicações que executam na AWS, sem custo adicional no nível básico?",
    options: [
      { id: "opt_a", text: "AWS Shield Standard." },
      { id: "opt_b", text: "Amazon GuardDuty." },
      { id: "opt_c", text: "AWS Secrets Manager." },
      { id: "opt_d", text: "Amazon Inspector." },
    ],
    correctOptionId: "opt_a",
    explanation:
      "O AWS Shield Standard é ativado automaticamente e protege todos os clientes da AWS contra ataques comuns de camada de rede e transporte (camadas 3 e 4) sem custo adicional.",
  },

  // DOMÍNIO 3: TECNOLOGIA E SERVIÇOS DE NUVEM
  {
    id: "q-d3-01",
    domain: "Domínio 3: Tecnologia e Serviços de Nuvem",
    topic: "Amazon S3 Classes de Armazenamento",
    stem: "Uma instituição médica precisa arquivar prontuários com acesso extremamente raro (uma vez ao ano), tolerando um tempo de recuperação de até 12 horas, buscando a opção de menor custo de armazenamento por gigabyte. Qual classe do Amazon S3 é a mais indicada?",
    options: [
      { id: "opt_a", text: "Amazon S3 Standard." },
      { id: "opt_b", text: "Amazon S3 One Zone-IA." },
      { id: "opt_c", text: "Amazon S3 Glacier Deep Archive." },
      { id: "opt_d", text: "Amazon S3 Standard-Infrequent Access." },
    ],
    correctOptionId: "opt_c",
    explanation:
      "O Amazon S3 Glacier Deep Archive é a classe de armazenamento de menor custo de toda a nuvem AWS para arquivamento de longo prazo, com tempo de recuperação padrão em torno de 12 horas.",
  },
  {
    id: "q-d3-02",
    domain: "Domínio 3: Tecnologia e Serviços de Nuvem",
    topic: "Opções de Compra do Amazon EC2",
    stem: "Qual opção de compra do Amazon EC2 oferece os maiores descontos (de até 90%), porém é recomendada apenas para cargas de trabalho que toleram interrupções repentinas e não são críticas?",
    options: [
      { id: "opt_a", text: "Instâncias Sob Demanda (On-Demand)." },
      { id: "opt_b", text: "Instâncias Spot." },
      { id: "opt_c", text: "Hosts Dedicados." },
      { id: "opt_d", text: "Instâncias Reservadas Padrão." },
    ],
    correctOptionId: "opt_b",
    explanation:
      "Instâncias Spot aproveitam a capacidade ociosa da AWS com descontos massivos, mas podem ser interrompidas com aviso prévio de dois minutos caso a AWS precise da capacidade.",
  },
  {
    id: "q-d3-03",
    domain: "Domínio 3: Tecnologia e Serviços de Nuvem",
    topic: "Computação Serverless",
    stem: "Qual serviço computacional serverless da AWS permite executar códigos em resposta a eventos sem a necessidade de provisionar, configurar ou gerenciar servidores?",
    options: [
      { id: "opt_a", text: "Amazon Elastic Compute Cloud (Amazon EC2)." },
      { id: "opt_b", text: "AWS Lambda." },
      { id: "opt_c", text: "AWS Elastic Beanstalk." },
      { id: "opt_d", text: "Amazon Lightsail." },
    ],
    correctOptionId: "opt_b",
    explanation:
      "O AWS Lambda é o principal serviço de computação serverless orientado a eventos da AWS. Você paga somente pelo tempo de computação consumido em milissegundos.",
  },

  // DOMÍNIO 4: FATURAMENTO, PREÇOS E SUPORTE
  {
    id: "q-d4-01",
    domain: "Domínio 4: Faturamento, Preços e Suporte",
    topic: "Ferramentas de Gestão de Custos",
    stem: "Um gestor de TI precisa definir limites personalizados de gastos e receber alertas por e-mail quando os custos estimados ou reais da fatura da AWS ultrapassarem o valor orçado. Qual ferramenta deve ser utilizada?",
    options: [
      { id: "opt_a", text: "AWS Budgets." },
      { id: "opt_b", text: "AWS Cost Explorer." },
      { id: "opt_c", text: "AWS Pricing Calculator." },
      { id: "opt_d", text: "Amazon CloudWatch Logs." },
    ],
    correctOptionId: "opt_a",
    explanation:
      "O AWS Budgets permite configurar orçamentos personalizados e disparar alertas via e-mail ou SNS sempre que os custos ultrapassarem limites predefinidos.",
  },
  {
    id: "q-d4-02",
    domain: "Domínio 4: Faturamento, Preços e Suporte",
    topic: "Planos de Suporte da AWS",
    stem: "Qual é o plano de suporte mais básico da AWS que concede acesso por chat e telefone 24 horas por dia, 7 dias por semana, a engenheiros de suporte (Cloud Support Engineers) com tempo de resposta de 1 hora para falhas em sistemas de produção?",
    options: [
      { id: "opt_a", text: "AWS Basic Support." },
      { id: "opt_b", text: "AWS Developer Support." },
      { id: "opt_c", text: "AWS Business Support." },
      { id: "opt_d", text: "AWS Global Partner Support." },
    ],
    correctOptionId: "opt_c",
    explanation:
      "O AWS Business Support é o primeiro nível que oferece suporte 24x7 via telefone e chat com Cloud Support Engineers e tempo de resposta de até 1 hora para falhas em ambientes de produção.",
  },
  {
    id: "q-d4-03",
    domain: "Domínio 4: Faturamento, Preços e Suporte",
    topic: "Faturamento Consolidado",
    stem: "Qual recurso do serviço AWS Organizations permite centralizar o pagamento de várias contas da AWS em uma única conta pagadora e usufruir de descontos por volume em escala?",
    options: [
      { id: "opt_a", text: "Faturamento Consolidado (Consolidated Billing)." },
      { id: "opt_b", text: "AWS Control Tower." },
      { id: "opt_c", text: "AWS Cost Anomaly Detection." },
      { id: "opt_d", text: "AWS Resource Access Manager (RAM)." },
    ],
    correctOptionId: "opt_a",
    explanation:
      "O Faturamento Consolidado (Consolidated Billing) agrega os custos de todas as contas vinculadas em uma fatura única mensal, compartilhando níveis de desconto por volume.",
  },
];
