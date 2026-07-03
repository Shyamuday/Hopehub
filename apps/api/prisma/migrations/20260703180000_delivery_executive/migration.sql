-- CreateEnum
CREATE TYPE "MedicineDeliveryStatus" AS ENUM ('PENDING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DELIVERY_EXECUTIVE';

-- CreateTable
CREATE TABLE "DeliveryExecutiveProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "employeeId" TEXT,
    "designation" TEXT NOT NULL DEFAULT 'Delivery Executive',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryExecutiveProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineDelivery" (
    "id" TEXT NOT NULL,
    "deliveryNumber" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "assignedExecutiveId" TEXT,
    "status" "MedicineDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryAddress" TEXT NOT NULL,
    "deliveryPhone" TEXT NOT NULL,
    "notes" TEXT,
    "otpHash" TEXT,
    "failureReason" TEXT,
    "proofNote" TEXT,
    "assignedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineDeliveryLine" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "medicineId" TEXT,
    "label" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "MedicineDeliveryLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryExecutiveProfile_userId_key" ON "DeliveryExecutiveProfile"("userId");
CREATE UNIQUE INDEX "DeliveryExecutiveProfile_employeeId_key" ON "DeliveryExecutiveProfile"("employeeId");
CREATE INDEX "DeliveryExecutiveProfile_storeId_idx" ON "DeliveryExecutiveProfile"("storeId");
CREATE UNIQUE INDEX "MedicineDelivery_deliveryNumber_key" ON "MedicineDelivery"("deliveryNumber");
CREATE INDEX "MedicineDelivery_storeId_status_idx" ON "MedicineDelivery"("storeId", "status");
CREATE INDEX "MedicineDelivery_assignedExecutiveId_status_idx" ON "MedicineDelivery"("assignedExecutiveId", "status");
CREATE INDEX "MedicineDelivery_patientId_idx" ON "MedicineDelivery"("patientId");
CREATE INDEX "MedicineDeliveryLine_deliveryId_idx" ON "MedicineDeliveryLine"("deliveryId");

-- AddForeignKey
ALTER TABLE "DeliveryExecutiveProfile" ADD CONSTRAINT "DeliveryExecutiveProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryExecutiveProfile" ADD CONSTRAINT "DeliveryExecutiveProfile_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicineDelivery" ADD CONSTRAINT "MedicineDelivery_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicineDelivery" ADD CONSTRAINT "MedicineDelivery_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicineDelivery" ADD CONSTRAINT "MedicineDelivery_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicineDelivery" ADD CONSTRAINT "MedicineDelivery_assignedExecutiveId_fkey" FOREIGN KEY ("assignedExecutiveId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicineDeliveryLine" ADD CONSTRAINT "MedicineDeliveryLine_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "MedicineDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicineDeliveryLine" ADD CONSTRAINT "MedicineDeliveryLine_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "StoreMedicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
