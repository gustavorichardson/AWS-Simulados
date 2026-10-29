import { prisma } from "./prisma";

type AdminSessionUser = {
  id: string;
  email: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hasConfiguredAdminIdentity(
  user: { email: string; role: string },
  configuredEmail: string | undefined
): boolean {
  if (!configuredEmail?.trim()) return false;
  const expectedEmail = normalizeEmail(configuredEmail);
  return user.role === "ADMIN" && normalizeEmail(user.email) === expectedEmail;
}

export async function isAdminUser(user: AdminSessionUser | null | undefined): Promise<boolean> {
  const configuredEmail = process.env.ADMIN_EMAIL;
  if (!user || !configuredEmail?.trim()) return false;

  const persistedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, role: true },
  });
  if (!persistedUser || !hasConfiguredAdminIdentity(persistedUser, configuredEmail)) return false;
  return normalizeEmail(user.email) === normalizeEmail(configuredEmail);
}
