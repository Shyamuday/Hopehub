BEGIN;

ALTER TABLE "Disease"
  ADD COLUMN "publicDomains" "ProviderDomain"[] NOT NULL
  DEFAULT ARRAY['HOMEOPATHY']::"ProviderDomain"[];

ALTER TABLE "BlogPost"
  ADD COLUMN "publicDomains" "ProviderDomain"[] NOT NULL
  DEFAULT ARRAY['HOMEOPATHY']::"ProviderDomain"[];

UPDATE "Disease"
SET "publicDomains" = ARRAY['HOPE_HUB']::"ProviderDomain"[]
WHERE "publicCategory" = 'Hope Hub';

UPDATE "BlogPost"
SET "publicDomains" = ARRAY['HOPE_HUB']::"ProviderDomain"[]
WHERE cardinality("concernSlugs") > 0
   OR lower("category") IN ('mental wellness', 'emotional wellness', 'mental health')
   OR "slug" IN (
     'understanding-anxiety-disorders',
     'managing-panic-attacks',
     'social-anxiety-tips',
     'navigating-breakup-recovery',
     'rebuilding-life-after-breakup',
     'understanding-grief-after-breakup',
     'understanding-depression-basics',
     'coping-strategies-depression',
     'depression-myths-facts',
     'self-care-basics-guide',
     'building-healthy-boundaries',
     'understanding-stress-response',
     'stress-management-techniques'
   );

DROP INDEX IF EXISTS "Disease_publicCategory_idx";

CREATE INDEX "Disease_isActive_publicCategory_idx"
  ON "Disease"("isActive", "publicCategory");
CREATE INDEX "Disease_publicDomains_idx" ON "Disease" USING GIN ("publicDomains");
CREATE INDEX "BlogPost_publicDomains_idx" ON "BlogPost" USING GIN ("publicDomains");

COMMIT;
