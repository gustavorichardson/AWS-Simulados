import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Persistência no PostgreSQL Local (Prisma ORM)", () => {
  const testEmail = `teste.estudante.${Date.now()}@aws-simulado.local`;
  let createdUserId: string;

  afterAll(async () => {
    // Limpeza de segurança dos dados gerados pelo teste
    if (createdUserId) {
      await prisma.user.deleteMany({
        where: { id: createdUserId },
      });
    }
    await prisma.$disconnect();
  });

  it("deve criar um usuário no banco PostgreSQL com sucesso", async () => {
    const user = await prisma.user.create({
      data: {
        name: "Estudante ADS Teste",
        email: testEmail,
      },
    });

    createdUserId = user.id;
    expect(user.id).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.name).toBe("Estudante ADS Teste");
    expect(user.emailVerified).toBe(false);
  });

  it("deve criar e relacionar o perfil do estudante com o usuário", async () => {
    const profile = await prisma.profile.create({
      data: {
        userId: createdUserId,
        course: "Análise e Desenvolvimento de Sistemas (ADS)",
        bio: "Preparando para o exame AWS CLF-C02",
      },
    });

    expect(profile.id).toBeDefined();
    expect(profile.userId).toBe(createdUserId);
    expect(profile.course).toContain("Análise e Desenvolvimento de Sistemas");

    // Verifica a busca do usuário com o perfil incluído
    const userWithProfile = await prisma.user.findUnique({
      where: { id: createdUserId },
      include: { profile: true },
    });

    expect(userWithProfile?.profile?.id).toBe(profile.id);
  });

  it("deve rejeitar a criação de usuário com e-mail duplicado (regra de unicidade)", async () => {
    await expect(
      prisma.user.create({
        data: {
          name: "Outro Usuário",
          email: testEmail, // E-mail já existente
        },
      })
    ).rejects.toThrow();
  });

  it("deve criar uma tentativa de simulado persistida para o usuário", async () => {
    const attempt = await prisma.examAttempt.create({
      data: {
        userId: createdUserId,
        questionCount: 15,
        selectedDomains: ["Domínio 1: Conceitos de Nuvem"],
        percentageScore: 80,
        estimatedScaledScore: 820,
        isPassed: true,
      },
    });

    expect(attempt.id).toBeDefined();
    expect(attempt.userId).toBe(createdUserId);
    expect(attempt.questionCount).toBe(15);
    expect(attempt.isPassed).toBe(true);

    const userAttempts = await prisma.examAttempt.findMany({
      where: { userId: createdUserId },
    });

    expect(userAttempts.length).toBeGreaterThanOrEqual(1);
  });

  it("deve propagar exclusão em cascata (onDelete: Cascade) ao deletar o usuário", async () => {
    // Cria um usuário temporário para teste de cascata
    const tempUser = await prisma.user.create({
      data: {
        name: "Temporário Cascata",
        email: `cascata.${Date.now()}@teste.local`,
        profile: {
          create: {
            course: "ADS",
          },
        },
        attempts: {
          create: {
            questionCount: 15,
            selectedDomains: ["Domínio 2: Segurança e Conformidade"],
          },
        },
      },
      include: {
        profile: true,
        attempts: true,
      },
    });

    const tempUserId = tempUser.id;
    const tempProfileId = tempUser.profile?.id;
    const tempAttemptId = tempUser.attempts[0]?.id;

    // Deleta o usuário pai
    await prisma.user.delete({
      where: { id: tempUserId },
    });

    // Verifica que perfil e tentativas foram excluídos automaticamente pelo PostgreSQL
    const profileAfter = await prisma.profile.findUnique({
      where: { id: tempProfileId },
    });
    const attemptAfter = await prisma.examAttempt.findUnique({
      where: { id: tempAttemptId },
    });

    expect(profileAfter).toBeNull();
    expect(attemptAfter).toBeNull();
  });
});
