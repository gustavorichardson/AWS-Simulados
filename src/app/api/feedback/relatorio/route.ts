import { withUser } from "@/lib/api";
import { getFeedbackReport } from "@/lib/feedback-report";

export const GET = withUser(async () => getFeedbackReport());
