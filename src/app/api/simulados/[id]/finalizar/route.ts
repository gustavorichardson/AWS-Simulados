import { readJson, withUser } from "@/lib/api";
import { finishExam } from "@/lib/exam-service";

export const POST = withUser<{ id: string }>(async ({ req, userId, params }) => {
  const body = (await readJson(req)) as { answers?: unknown } | null;
  return { result: await finishExam(userId, params.id, body?.answers ?? {}) };
});
