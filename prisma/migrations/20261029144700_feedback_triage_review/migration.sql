ALTER TABLE "question_feedback"
ADD COLUMN "issueLocation" TEXT,
ADD COLUMN "reportedAnswer" TEXT,
ADD COLUMN "detail" TEXT,
ADD COLUMN "triageStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "triageReason" TEXT,
ADD COLUMN "duplicateOfId" TEXT,
ADD COLUMN "actionTaken" TEXT,
ADD COLUMN "triagedAt" TIMESTAMP(3);

ALTER TABLE "question_feedback"
ALTER COLUMN "triageStatus" SET DEFAULT 'PENDING';

CREATE INDEX "question_feedback_triageStatus_domain_topic_idx"
ON "question_feedback"("triageStatus", "domain", "topic");

CREATE TABLE "exam_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "exam_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_reviews_attemptId_key" ON "exam_reviews"("attemptId");
CREATE INDEX "exam_reviews_userId_createdAt_idx" ON "exam_reviews"("userId", "createdAt");

ALTER TABLE "exam_reviews"
ADD CONSTRAINT "exam_reviews_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_reviews"
ADD CONSTRAINT "exam_reviews_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
