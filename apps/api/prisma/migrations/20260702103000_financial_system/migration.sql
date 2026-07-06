-- CreateEnum
CREATE TYPE "ExpenseLevel" AS ENUM ('CLINIC', 'STORE');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'ELECTRICITY', 'WATER', 'INTERNET', 'TELEPHONE', 'EQUIPMENT', 'SOFTWARE', 'FURNITURE', 'VEHICLE', 'STATIONERY', 'OFFICE_SUPPLIES', 'PACKAGING', 'CLEANING_SUPPLIES', 'MEDICAL_SUPPLIES', 'SALARY', 'TRAINING', 'INSURANCE', 'LEGAL', 'SECURITY', 'MARKETING', 'MAINTENANCE', 'LOGISTICS', 'BANK_CHARGES', 'MISC');

-- AlterTable (StockMovement may not exist on fresh DB until baseline schema is applied)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'StockMovement'
  ) THEN
    ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "amountInPaise" INTEGER;
  END IF;
END $$;

-- CreateTable
CREATE TABLE "BusinessExpense" (
    "id" TEXT NOT NULL,
    "level" "ExpenseLevel" NOT NULL,
    "storeId" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" TEXT,
    "billNo" TEXT,
    "amountInPaise" INTEGER NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessExpense_level_expenseDate_idx" ON "BusinessExpense"("level", "expenseDate");

-- CreateIndex
CREATE INDEX "BusinessExpense_storeId_expenseDate_idx" ON "BusinessExpense"("storeId", "expenseDate");

-- CreateIndex
CREATE INDEX "BusinessExpense_category_idx" ON "BusinessExpense"("category");

-- AddForeignKey
ALTER TABLE "BusinessExpense" ADD CONSTRAINT "BusinessExpense_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
