import { readJson, withUser } from "@/lib/api";
import { saveQuestionFeedback } from "@/lib/exam-service";

export const POST = withUser<{ id: string }>(async ({ req, userId, params }) =>
  saveQuestionFeedback(userId, params.id, await readJson(req))
);
