ALTER TABLE "questions"
ADD COLUMN "optionExplanations" JSONB;

ALTER TABLE "exam_attempts"
ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM';

UPDATE "questions"
SET "difficulty" = 'MEDIUM'
WHERE "optionExplanations" IS NULL;
