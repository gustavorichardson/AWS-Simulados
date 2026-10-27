import { readJson, withUser } from "@/lib/api";
import { startExam } from "@/lib/exam-service";

export const POST = withUser(async ({ req, userId }) => startExam(userId, await readJson(req)), 201);
