import { loadEnvConfig } from "@next/env";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";

loadEnvConfig(process.cwd());

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente antes de executar o seed.");
  }
  if (password.length < 8 || password.length > 128) {
    throw new Error("ADMIN_PASSWORD deve ter entre 8 e 128 caracteres.");
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.upsert({
      where: { email },
      update: { name: "Administrador", emailVerified: true, role: "ADMIN" },
      create: {
        name: "Administrador",
        email,
        emailVerified: true,
        role: "ADMIN",
      },
    });

    const credential = await transaction.account.findFirst({
      where: { userId: user.id, accountId: user.id, providerId: "credential" },
      select: { id: true },
    });

    if (credential) {
      await transaction.account.update({
        where: { id: credential.id },
        data: { password: passwordHash },
      });
    } else {
      await transaction.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: passwordHash,
        },
      });
    }

    await transaction.session.deleteMany({ where: { userId: user.id } });
  });

  console.info("Conta administrativa criada ou atualizada; sessões anteriores foram invalidadas.");
}

seedAdmin()
  .catch((error: unknown) => {
    console.error("Falha ao criar a conta administrativa.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
