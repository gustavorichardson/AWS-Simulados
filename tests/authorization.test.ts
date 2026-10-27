import { describe, it, expect, afterAll } from "vitest";
import {
  validateResourceOwnership,
  assertResourceOwnership,
  ForbiddenAccessError,
} from "../src/lib/server-auth";
import { prisma } from "../src/lib/prisma";

describe("Segurança de Autorização e Isolamento de Dados entre Usuários", () => {
  const userAEmail = `usuario.a.${Date.now()}@teste.local`;
  const userBEmail = `usuario.b.${Date.now()}@teste.local`;
  let userAId: string;
  let userBId: string;
  let attemptAId: string;

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: [userAEmail, userBEmail] },
      },
    });
    await prisma.$disconnect();
  });

  it("deve validar corretamente se o usuário é o dono do recurso", () => {
    // Mesmo usuário -> Acesso Permitido
    expect(validateResourceOwnership("usr_123", "usr_123")).toBe(true);

    // Usuários diferentes -> Acesso Negado
    expect(validateResourceOwnership("usr_123", "usr_999")).toBe(false);

    // Usuário ausente -> Acesso Negado
    expect(validateResourceOwnership("", "usr_123")).toBe(false);
  });

  it("deve lançar ForbiddenAccessError quando um usuário tentar acessar recurso de outro", () => {
    const usuarioLogado = "usr_estudante_b";
    const donoDoSimulado = "usr_estudante_a";

    expect(() =>
      assertResourceOwnership(donoDoSimulado, usuarioLogado)
    ).toThrow(ForbiddenAccessError);

    // Quando for o mesmo usuário, não deve lançar erro
    expect(() =>
      assertResourceOwnership(usuarioLogado, usuarioLogado)
    ).not.toThrow();
  });

  it("deve garantir no banco de dados que as tentativas do Usuário A nunca sejam expostas ao Usuário B", async () => {
    // Cria Usuário A e Usuário B
    const userA = await prisma.user.create({
      data: { name: "Estudante A", email: userAEmail },
    });
    const userB = await prisma.user.create({
      data: { name: "Estudante B", email: userBEmail },
    });

    userAId = userA.id;
    userBId = userB.id;

    // Registra um simulado para o Usuário A
    const attemptA = await prisma.examAttempt.create({
      data: {
        userId: userAId,
        questionCount: 15,
        selectedDomains: ["Domínio 3: Tecnologia e Serviços de Nuvem"],
        percentageScore: 90,
        estimatedScaledScore: 910,
        isPassed: true,
      },
    });

    attemptAId = attemptA.id;

    // 1. Simula a consulta que a API faz para o Usuário B (com filtro estrito por userId)
    const attemptsOfUserB = await prisma.examAttempt.findMany({
      where: { userId: userBId },
    });

    // O Usuário B não deve receber NENHUMA tentativa do Usuário A
    expect(attemptsOfUserB).toHaveLength(0);
    expect(attemptsOfUserB.some((att) => att.id === attemptAId)).toBe(false);

    // 2. Simula a verificação de propriedade ao tentar buscar diretamente pelo ID da tentativa do Usuário A
    const attemptFound = await prisma.examAttempt.findUnique({
      where: { id: attemptAId },
    });

    expect(attemptFound).toBeDefined();
    expect(attemptFound?.userId).toBe(userAId);

    // Validação de autorização no servidor:
    const isUserBAuthorizedToViewAttemptA = validateResourceOwnership(
      attemptFound!.userId,
      userBId
    );

    expect(isUserBAuthorizedToViewAttemptA).toBe(false);
  });
});
