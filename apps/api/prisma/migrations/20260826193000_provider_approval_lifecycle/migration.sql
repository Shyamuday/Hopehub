BEGIN;

CREATE TYPE "ProviderApprovalStatus" AS ENUM (
  'NOT_REQUIRED',
  'DRAFT',
  'PENDING',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED'
);

ALTER TABLE "Doctor"
  ADD COLUMN "registrationNoNormalized" TEXT,
  ADD COLUMN "approvalStatus" "ProviderApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "approvalRequestedAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvalNote" TEXT,
  ADD COLUMN "credentialDocumentKey" TEXT,
  ADD COLUMN "credentialDocumentFileName" TEXT,
  ADD COLUMN "credentialDocumentMimeType" TEXT,
  ADD COLUMN "credentialDocumentUploadedAt" TIMESTAMP(3);

UPDATE "Doctor"
SET "approvalStatus" = CASE
  WHEN "providerDomain" = 'HOPE_HUB' THEN 'NOT_REQUIRED'::"ProviderApprovalStatus"
  WHEN "suspendedAt" IS NULL THEN 'APPROVED'::"ProviderApprovalStatus"
  WHEN lower(coalesce("suspendedReason", '')) LIKE 'awaiting homeopathy credential verification%' THEN 'PENDING'::"ProviderApprovalStatus"
  WHEN lower(coalesce("suspendedReason", '')) LIKE 'homeopathy credential verification needs changes%' THEN 'CHANGES_REQUESTED'::"ProviderApprovalStatus"
  ELSE 'DRAFT'::"ProviderApprovalStatus"
END,
"approvalRequestedAt" = CASE
  WHEN lower(coalesce("suspendedReason", '')) LIKE 'awaiting homeopathy credential verification%' THEN "updatedAt"
  ELSE NULL
END,
"approvedAt" = CASE
  WHEN "providerDomain" = 'HOMEOPATHY' AND "suspendedAt" IS NULL THEN "updatedAt"
  ELSE NULL
END;

WITH normalized AS (
  SELECT
    "id",
    lower(regexp_replace("registrationNo", '[^a-zA-Z0-9]+', '', 'g')) AS value,
    count(*) OVER (
      PARTITION BY lower(regexp_replace("registrationNo", '[^a-zA-Z0-9]+', '', 'g'))
    ) AS duplicate_count
  FROM "Doctor"
  WHERE "providerDomain" = 'HOMEOPATHY'
    AND nullif(trim(coalesce("registrationNo", '')), '') IS NOT NULL
)
UPDATE "Doctor" AS doctor
SET "registrationNoNormalized" = normalized.value
FROM normalized
WHERE doctor."id" = normalized."id"
  AND normalized.duplicate_count = 1
  AND normalized.value <> '';

CREATE UNIQUE INDEX "Doctor_registrationNoNormalized_key"
  ON "Doctor"("registrationNoNormalized");
CREATE INDEX "Doctor_approvalStatus_providerDomain_idx"
  ON "Doctor"("approvalStatus", "providerDomain");

COMMIT;
