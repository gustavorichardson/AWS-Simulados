import { withUser } from "@/lib/api";
import { getResult } from "@/lib/exam-service";

export const GET = withUser<{ id: string }>(async ({ userId, params }) => ({
  result: await getResult(userId, params.id),
}));
