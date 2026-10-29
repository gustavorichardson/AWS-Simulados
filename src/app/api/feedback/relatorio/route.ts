import { withAdmin } from "@/lib/api";
import { getFeedbackReport } from "@/lib/feedback-report";

export const GET = withAdmin(async () => getFeedbackReport());
