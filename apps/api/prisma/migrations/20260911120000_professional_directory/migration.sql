BEGIN;

CREATE TABLE "ProfessionalDirectorySource" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sha256" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "pdf" BYTEA NOT NULL,
  "pageTexts" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ProfessionalDirectorySource_sha256_key" ON "ProfessionalDirectorySource"("sha256");
CREATE TABLE "ProfessionalDirectoryRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceId" TEXT NOT NULL REFERENCES "ProfessionalDirectorySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "sourceRecordId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "professionalTitle" TEXT NOT NULL,
  "emails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "fields" JSONB NOT NULL,
  "rawCells" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ProfessionalDirectoryRecord_sourceId_sourceRecordId_key" ON "ProfessionalDirectoryRecord"("sourceId", "sourceRecordId");
CREATE INDEX "ProfessionalDirectoryRecord_category_city_idx" ON "ProfessionalDirectoryRecord"("category", "city");
CREATE INDEX "ProfessionalDirectoryRecord_emails_idx" ON "ProfessionalDirectoryRecord" USING GIN ("emails");

COMMIT;
