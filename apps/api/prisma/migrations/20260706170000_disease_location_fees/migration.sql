-- CreateTable
CREATE TABLE "DiseaseLocationFee" (
    "id" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "locationKey" TEXT NOT NULL,
    "feeInPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiseaseLocationFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiseaseLocationFee_diseaseId_locationKey_key" ON "DiseaseLocationFee"("diseaseId", "locationKey");
CREATE INDEX "DiseaseLocationFee_locationKey_idx" ON "DiseaseLocationFee"("locationKey");

-- AddForeignKey
ALTER TABLE "DiseaseLocationFee" ADD CONSTRAINT "DiseaseLocationFee_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
