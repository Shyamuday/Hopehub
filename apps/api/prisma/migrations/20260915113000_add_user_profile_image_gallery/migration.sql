BEGIN;

CREATE TABLE "UserProfileImage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "imageUrl" TEXT,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfileImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProfileImage_storageKey_key" ON "UserProfileImage"("storageKey");
CREATE INDEX "UserProfileImage_userId_createdAt_idx" ON "UserProfileImage"("userId", "createdAt");
CREATE INDEX "UserProfileImage_userId_isPrimary_idx" ON "UserProfileImage"("userId", "isPrimary");
CREATE UNIQUE INDEX "UserProfileImage_one_primary_per_user_idx"
    ON "UserProfileImage"("userId") WHERE "isPrimary" = true;

ALTER TABLE "UserProfileImage"
    ADD CONSTRAINT "UserProfileImage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve every existing uploaded profile photo as the first gallery item.
INSERT INTO "UserProfileImage" (
    "id", "userId", "storageKey", "imageUrl", "isPrimary", "createdAt", "updatedAt"
)
SELECT
    'legacy_' || md5("id" || ':' || "profileImageKey"),
    "id",
    "profileImageKey",
    "profileImageUrl",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "profileImageKey" IS NOT NULL
ON CONFLICT ("storageKey") DO NOTHING;

CREATE TABLE "StoreStaffProfileImage" (
    "id" TEXT NOT NULL,
    "storeStaffId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "imageUrl" TEXT,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreStaffProfileImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreStaffProfileImage_storageKey_key" ON "StoreStaffProfileImage"("storageKey");
CREATE INDEX "StoreStaffProfileImage_storeStaffId_createdAt_idx" ON "StoreStaffProfileImage"("storeStaffId", "createdAt");
CREATE INDEX "StoreStaffProfileImage_storeStaffId_isPrimary_idx" ON "StoreStaffProfileImage"("storeStaffId", "isPrimary");
CREATE UNIQUE INDEX "StoreStaffProfileImage_one_primary_per_staff_idx"
    ON "StoreStaffProfileImage"("storeStaffId") WHERE "isPrimary" = true;

ALTER TABLE "StoreStaffProfileImage"
    ADD CONSTRAINT "StoreStaffProfileImage_storeStaffId_fkey"
    FOREIGN KEY ("storeStaffId") REFERENCES "StoreStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "StoreStaffProfileImage" (
    "id", "storeStaffId", "storageKey", "imageUrl", "isPrimary", "createdAt", "updatedAt"
)
SELECT
    'legacy_' || md5("id" || ':' || "profileImageKey"),
    "id",
    "profileImageKey",
    "profileImageUrl",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "StoreStaff"
WHERE "profileImageKey" IS NOT NULL
ON CONFLICT ("storageKey") DO NOTHING;

COMMIT;
