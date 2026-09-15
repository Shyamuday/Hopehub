BEGIN;

ALTER TABLE "User"
  ADD COLUMN "preferredName" TEXT,
  ADD COLUMN "pronouns" TEXT,
  ADD COLUMN "aboutMe" TEXT,
  ADD COLUMN "supportPreferences" TEXT;

COMMIT;
