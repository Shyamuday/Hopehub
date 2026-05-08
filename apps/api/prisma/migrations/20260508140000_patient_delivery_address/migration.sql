-- AlterTable
ALTER TABLE "User"
ADD COLUMN "deliveryAddressLine1" TEXT,
ADD COLUMN "deliveryAddressLine2" TEXT,
ADD COLUMN "deliveryCity" TEXT,
ADD COLUMN "deliveryState" TEXT,
ADD COLUMN "deliveryPincode" TEXT;
