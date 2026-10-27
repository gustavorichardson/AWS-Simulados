import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias de validade
    updateAge: 60 * 60 * 24, // atualiza se tiver mais de 1 dia
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutos de cache em cookie
    },
  },
});
