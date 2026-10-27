import { withUser } from "@/lib/api";
import { getAttemptForUser } from "@/lib/exam-service";

export const GET = withUser<{ id: string }>(async ({ userId, params }) => ({
  attempt: await getAttemptForUser(userId, params.id),
}));
