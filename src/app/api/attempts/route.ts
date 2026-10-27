import { withUser } from "@/lib/api";
import { listAttemptsForUser } from "@/lib/exam-service";

export const GET = withUser(async ({ userId }) => ({ attempts: await listAttemptsForUser(userId) }));
