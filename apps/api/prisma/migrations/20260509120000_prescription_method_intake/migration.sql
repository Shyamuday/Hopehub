-- Structured homeopathy method-specific clinical fields (doctor UI → JSON).
ALTER TABLE "Prescription" ADD COLUMN "methodIntakeAnswers" JSONB;
