import { readJson, withUser } from "@/lib/api";
import { saveProgress } from "@/lib/exam-service";

export const PATCH = withUser<{ id: string }>(async ({ req, userId, params }) => {
  const body = (await readJson(req)) as { answers?: unknown } | null;
  return saveProgress(userId, params.id, body?.answers ?? {});
});
