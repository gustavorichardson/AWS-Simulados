import { withUser } from "@/lib/api";
import { startRecoveryExam } from "@/lib/exam-service";

export const POST = withUser<{ id: string }>(async ({ req, userId, params }) => {
  const body = await req.json().catch(() => ({}));
  return startRecoveryExam(userId, params.id, body);
}, 201);
