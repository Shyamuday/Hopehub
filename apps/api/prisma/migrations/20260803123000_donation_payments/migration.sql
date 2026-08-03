CREATE TABLE "DonationPayment" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'razorpay',
  "providerOrderId" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "amountInPaise" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "donorName" TEXT,
  "donorEmail" TEXT,
  "donorPhone" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "notes" JSONB,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DonationPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DonationPayment_providerOrderId_key" ON "DonationPayment"("providerOrderId");
CREATE INDEX "DonationPayment_status_createdAt_idx" ON "DonationPayment"("status", "createdAt");
CREATE INDEX "DonationPayment_providerPaymentId_idx" ON "DonationPayment"("providerPaymentId");
CREATE INDEX "DonationPayment_donorEmail_idx" ON "DonationPayment"("donorEmail");
CREATE INDEX "DonationPayment_donorPhone_idx" ON "DonationPayment"("donorPhone");
