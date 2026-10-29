import { readJson, withUser } from "@/lib/api";
import { saveExamReview, saveQuestionFeedback } from "@/lib/exam-service";

export const POST = withUser<{ id: string }>(async ({ req, userId, params }) => {
  const body: unknown = await readJson(req);
  if (
    typeof body === "object" &&
    body !== null &&
    "type" in body &&
    body.type === "AVALIACAO_SIMULADO" &&
    "review" in body
  ) {
    return saveExamReview(userId, params.id, body.review);
  }
  return saveQuestionFeedback(userId, params.id, body);
});
