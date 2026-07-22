CREATE TYPE "PublicContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "PublicPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "summary" TEXT,
  "content" JSONB,
  "seo" JSONB,
  "status" "PublicContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PublicPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicPage_slug_key" ON "PublicPage"("slug");
CREATE INDEX "PublicPage_status_idx" ON "PublicPage"("status");
CREATE INDEX "PublicPage_sortOrder_idx" ON "PublicPage"("sortOrder");
