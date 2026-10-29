ALTER TABLE "exam_answers"
ADD COLUMN "unknownOptionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "question_feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficultyDirection" TEXT,
    "difficulty" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "question_feedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feedback_generation_usages" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "generatedQuestionId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feedback_generation_usages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feedback_metric_snapshots" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feedback_metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_feedback_attemptId_questionId_category_key"
ON "question_feedback"("attemptId", "questionId", "category");
CREATE INDEX "question_feedback_domain_topic_category_createdAt_idx"
ON "question_feedback"("domain", "topic", "category", "createdAt");
CREATE INDEX "question_feedback_usedAt_idx" ON "question_feedback"("usedAt");
CREATE UNIQUE INDEX "feedback_generation_usages_feedbackId_generatedQuestionId_key"
ON "feedback_generation_usages"("feedbackId", "generatedQuestionId");
CREATE INDEX "feedback_generation_usages_generatedQuestionId_usedAt_idx"
ON "feedback_generation_usages"("generatedQuestionId", "usedAt");
CREATE UNIQUE INDEX "feedback_metric_snapshots_date_key" ON "feedback_metric_snapshots"("date");

ALTER TABLE "question_feedback"
ADD CONSTRAINT "question_feedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_feedback"
ADD CONSTRAINT "question_feedback_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_feedback"
ADD CONSTRAINT "question_feedback_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback_generation_usages"
ADD CONSTRAINT "feedback_generation_usages_feedbackId_fkey"
FOREIGN KEY ("feedbackId") REFERENCES "question_feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback_generation_usages"
ADD CONSTRAINT "feedback_generation_usages_generatedQuestionId_fkey"
FOREIGN KEY ("generatedQuestionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
