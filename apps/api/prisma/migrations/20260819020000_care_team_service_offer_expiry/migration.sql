ALTER TABLE "CareTeamService"
ADD COLUMN "offerEndsAt" TIMESTAMP(3);

CREATE INDEX "CareTeamService_offerEndsAt_idx"
ON "CareTeamService"("offerEndsAt");
