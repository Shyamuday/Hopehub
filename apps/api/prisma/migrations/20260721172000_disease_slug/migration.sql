ALTER TABLE "Disease" ADD COLUMN IF NOT EXISTS "slug" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Disease_slug_key" ON "Disease"("slug");
CREATE INDEX IF NOT EXISTS "Disease_slug_idx" ON "Disease"("slug");
