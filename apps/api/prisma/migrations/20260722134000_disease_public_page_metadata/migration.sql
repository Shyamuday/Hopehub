CREATE TYPE "PublicPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "Disease"
  ADD COLUMN "publicPageStatus" "PublicPageStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "publicPagePublishedAt" TIMESTAMP(3),
  ADD COLUMN "publicPageReviewedAt" TIMESTAMP(3);

UPDATE "Disease"
SET "publicPagePublishedAt" = COALESCE("publicPagePublishedAt", "updatedAt")
WHERE "publicPageContent" IS NOT NULL
   OR "publicFaq" IS NOT NULL
   OR "publicDescription" IS NOT NULL
   OR "publicImageUrl" IS NOT NULL;

CREATE INDEX "Disease_publicPageStatus_idx" ON "Disease"("publicPageStatus");
