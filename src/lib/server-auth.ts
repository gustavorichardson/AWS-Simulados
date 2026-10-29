import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { isSessionExpired, sessionPolicy } from "./session-policy";

/**
 * Obtém a sessão do usuário autenticado no servidor a partir dos headers da requisição.
 */
export async function getServerSession() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });
  if (!session?.session?.id) return null;

  const persisted = await prisma.session.findUnique({
    where: { id: session.session.id },
    select: { id: true, createdAt: true, updatedAt: true, expiresAt: true },
  });
  if (!persisted) return null;
  if (isSessionExpired(persisted, new Date(), sessionPolicy)) {
    await prisma.session.deleteMany({ where: { id: persisted.id } });
    return null;
  }
  return session;
}

/**
 * Validação de autorização estrita no servidor:
 * Garante que o usuário está autenticado; se não estiver, lança erro de autenticação.
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED: Usuário não autenticado");
  }
  return session;
}

/**
 * Validação de Isolamento de Dados (Tenant Isolation / IDOR Protection):
 * Garante que o usuário autenticado só possa acessar ou modificar seus próprios recursos.
 */
export function validateResourceOwnership(
  resourceOwnerId: string,
  currentUserId: string
): boolean {
  if (!resourceOwnerId || !currentUserId) return false;
  return resourceOwnerId === currentUserId;
}

export class ForbiddenAccessError extends Error {
  constructor(message = "FORBIDDEN: Você não possui autorização para acessar este recurso.") {
    super(message);
    this.name = "ForbiddenAccessError";
  }
}

/**
 * Lança ForbiddenAccessError caso o recurso pertença a outro usuário.
 */
export function assertResourceOwnership(
  resourceOwnerId: string,
  currentUserId: string
) {
  if (!validateResourceOwnership(resourceOwnerId, currentUserId)) {
    throw new ForbiddenAccessError();
  }
}
