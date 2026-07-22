ALTER TABLE "HealthService" ADD COLUMN "subCategory" TEXT;

CREATE INDEX "HealthService_subCategory_idx" ON "HealthService"("subCategory");
