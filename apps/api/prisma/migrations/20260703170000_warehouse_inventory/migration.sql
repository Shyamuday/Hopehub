-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WAREHOUSE_MANAGER';

-- CreateEnum
CREATE TYPE "StoreKind" AS ENUM ('BRANCH', 'WAREHOUSE');
CREATE TYPE "StockTransferStatus" AS ENUM ('PENDING_DISPATCH', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "kind" "StoreKind" NOT NULL DEFAULT 'BRANCH';

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromStoreId" TEXT NOT NULL,
    "toStoreId" TEXT NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'PENDING_DISPATCH',
    "notes" TEXT,
    "createdById" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockTransferLine" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "qtyRequested" INTEGER NOT NULL,
    "qtyDispatched" INTEGER NOT NULL DEFAULT 0,
    "qtyReceived" INTEGER NOT NULL DEFAULT 0,
    "sourceBatchId" TEXT,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "purchasePricePerUnit" INTEGER,
    "sellingPricePerUnit" INTEGER,

    CONSTRAINT "StockTransferLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseManagerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "employeeId" TEXT,
    "designation" TEXT NOT NULL DEFAULT 'Warehouse Manager',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseManagerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_transferNumber_key" ON "StockTransfer"("transferNumber");
CREATE INDEX "StockTransfer_fromStoreId_status_idx" ON "StockTransfer"("fromStoreId", "status");
CREATE INDEX "StockTransfer_toStoreId_status_idx" ON "StockTransfer"("toStoreId", "status");
CREATE INDEX "StockTransferLine_transferId_idx" ON "StockTransferLine"("transferId");
CREATE UNIQUE INDEX "WarehouseManagerProfile_userId_key" ON "WarehouseManagerProfile"("userId");
CREATE UNIQUE INDEX "WarehouseManagerProfile_employeeId_key" ON "WarehouseManagerProfile"("employeeId");
CREATE INDEX "WarehouseManagerProfile_warehouseId_idx" ON "WarehouseManagerProfile"("warehouseId");

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "StoreMedicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseManagerProfile" ADD CONSTRAINT "WarehouseManagerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseManagerProfile" ADD CONSTRAINT "WarehouseManagerProfile_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
