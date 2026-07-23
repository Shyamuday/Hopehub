ALTER TABLE "Testimonial"
  ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentToPublish" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "submitterEmail" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN "entryPage" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

UPDATE "Testimonial"
SET "consentToPublish" = "isPublished",
    "source" = 'admin',
    "reviewedAt" = CASE WHEN "isPublished" THEN "updatedAt" ELSE NULL END;

CREATE INDEX "Testimonial_consentToPublish_idx" ON "Testimonial"("consentToPublish");
CREATE INDEX "Testimonial_source_idx" ON "Testimonial"("source");
