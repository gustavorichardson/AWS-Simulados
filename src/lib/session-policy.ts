export interface SessionPolicy {
  idleTimeoutMs: number;
  maximumLifetimeMs: number;
}

export function isSessionExpired(
  session: { createdAt: Date; updatedAt: Date; expiresAt: Date },
  now: Date,
  policy: SessionPolicy
): boolean {
  return (
    session.expiresAt <= now ||
    session.updatedAt.getTime() + policy.idleTimeoutMs <= now.getTime() ||
    session.createdAt.getTime() + policy.maximumLifetimeMs <= now.getTime()
  );
}

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} deve ser um inteiro positivo.`);
  }
  return value;
}

export const sessionPolicy: SessionPolicy = {
  idleTimeoutMs: readPositiveInteger("AUTH_SESSION_IDLE_MINUTES", 30) * 60_000,
  maximumLifetimeMs: readPositiveInteger("AUTH_SESSION_MAX_DAYS", 7) * 24 * 60 * 60_000,
};
