-- AlterTable
ALTER TABLE "exam_answers" ADD COLUMN     "optionOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'NAO_RESPONDIDA';

-- AlterTable
ALTER TABLE "exam_attempts" ADD COLUMN     "correctCount" INTEGER,
ADD COLUMN     "dontKnowCount" INTEGER,
ADD COLUMN     "incorrectCount" INTEGER,
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'PROVA',
ADD COLUMN     "selectedSubtopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sourceAttemptId" TEXT,
ADD COLUMN     "unansweredCount" INTEGER;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'BANCO_INICIAL',
ADD COLUMN     "stemHash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "exam_attempts_userId_idx" ON "exam_attempts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "questions_stemHash_key" ON "questions"("stemHash");

-- CreateIndex
CREATE INDEX "questions_domain_topic_idx" ON "questions"("domain", "topic");

