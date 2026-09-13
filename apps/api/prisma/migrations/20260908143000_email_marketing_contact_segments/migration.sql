BEGIN;

ALTER TABLE "EmailMarketingContact"
  ADD COLUMN "mobile" TEXT,
  ADD COLUMN "normalizedMobile" TEXT,
  ADD COLUMN "alternatePhone" TEXT,
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "landmark" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "sourceChannel" TEXT,
  ADD COLUMN "sourceSegments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "productNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "productSkus" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "paymentMethods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "orderStatuses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "productSearchText" TEXT,
  ADD COLUMN "firstOrderAt" TIMESTAMP(3),
  ADD COLUMN "lastOrderAt" TIMESTAMP(3),
  ADD COLUMN "orderCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalOrderValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "currency" TEXT DEFAULT 'INR';

ALTER TABLE "EmailCampaign" ADD COLUMN "audienceFilter" JSONB;

CREATE INDEX "EmailMarketingContact_normalizedMobile_idx" ON "EmailMarketingContact"("normalizedMobile");
CREATE INDEX "EmailMarketingContact_state_idx" ON "EmailMarketingContact"("state");
CREATE INDEX "EmailMarketingContact_city_idx" ON "EmailMarketingContact"("city");
CREATE INDEX "EmailMarketingContact_postalCode_idx" ON "EmailMarketingContact"("postalCode");
CREATE INDEX "EmailMarketingContact_sourceChannel_idx" ON "EmailMarketingContact"("sourceChannel");
CREATE INDEX "EmailMarketingContact_lastOrderAt_idx" ON "EmailMarketingContact"("lastOrderAt");
CREATE INDEX "EmailMarketingContact_orderCount_idx" ON "EmailMarketingContact"("orderCount");
CREATE INDEX "EmailMarketingContact_totalOrderValue_idx" ON "EmailMarketingContact"("totalOrderValue");
CREATE INDEX "EmailMarketingContact_sourceSegments_gin_idx" ON "EmailMarketingContact" USING GIN ("sourceSegments");
CREATE INDEX "EmailMarketingContact_tags_gin_idx" ON "EmailMarketingContact" USING GIN ("tags");
CREATE INDEX "EmailMarketingContact_productSkus_gin_idx" ON "EmailMarketingContact" USING GIN ("productSkus");
CREATE INDEX "EmailMarketingContact_paymentMethods_gin_idx" ON "EmailMarketingContact" USING GIN ("paymentMethods");
CREATE INDEX "EmailMarketingContact_orderStatuses_gin_idx" ON "EmailMarketingContact" USING GIN ("orderStatuses");

COMMIT;
