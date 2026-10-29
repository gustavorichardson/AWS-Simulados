import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { sessionPolicy } from "./session-policy";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const sessionExpiresIn = Math.floor(sessionPolicy.maximumLifetimeMs / 1000);

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  trustedOrigins: [baseURL],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  session: {
    expiresIn: sessionExpiresIn,
    updateAge: 60,
    cookieCache: {
      enabled: false,
    },
  },
});
