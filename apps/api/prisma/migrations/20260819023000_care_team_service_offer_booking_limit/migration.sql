ALTER TABLE "CareTeamService"
ADD COLUMN "offerBookingLimit" INTEGER;

CREATE INDEX "CareTeamService_offerBookingLimit_idx"
ON "CareTeamService"("offerBookingLimit");
