ALTER TABLE "ListenerScreeningQuestionSet"
ALTER COLUMN "passScore" SET DEFAULT 6;

UPDATE "ListenerScreeningQuestionSet"
SET "passScore" = 6,
    "updatedAt" = NOW()
WHERE "passScore" <> 6;
