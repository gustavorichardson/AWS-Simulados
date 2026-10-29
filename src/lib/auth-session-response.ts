function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function redactSessionToken(response: Response): Promise<Response> {
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    return response;
  }

  const payload: unknown = await response.clone().json();
  if (payload === null) return response;
  if (!isRecord(payload) || !isRecord(payload.session) || !isRecord(payload.user)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  const safePayload = {
    session: {
      expiresAt: payload.session.expiresAt,
    },
    user: {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      emailVerified: payload.user.emailVerified,
    },
    ...(typeof payload.needsRefresh === "boolean"
      ? { needsRefresh: payload.needsRefresh }
      : {}),
  };

  return new Response(JSON.stringify(safePayload), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
