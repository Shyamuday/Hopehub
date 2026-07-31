CREATE TABLE IF NOT EXISTS "AssessmentDefinition" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT 'v1',
  "config" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentDefinition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssessmentDefinition_category_isActive_idx" ON "AssessmentDefinition"("category", "isActive");
CREATE INDEX IF NOT EXISTS "AssessmentDefinition_isActive_sortOrder_idx" ON "AssessmentDefinition"("isActive", "sortOrder");
