CREATE TYPE "ProviderDomain" AS ENUM ('HOMEOPATHY', 'HOPE_HUB');
CREATE TYPE "ProviderRoleAssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

ALTER TABLE "Doctor" ADD COLUMN "providerDomain" "ProviderDomain" NOT NULL DEFAULT 'HOMEOPATHY';
UPDATE "Doctor" SET "providerDomain" = 'HOPE_HUB' WHERE "doctorType" = 'PSYCHOLOGIST';

CREATE TABLE "ProviderRoleDefinition" (
  "code" TEXT NOT NULL PRIMARY KEY,
  "domain" "ProviderDomain" NOT NULL DEFAULT 'HOPE_HUB',
  "label" TEXT NOT NULL,
  "shortLabel" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "tone" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "bestFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "ctaLabel" TEXT NOT NULL,
  "requiresCredentials" BOOLEAN NOT NULL DEFAULT false,
  "requiresListenerScreening" BOOLEAN NOT NULL DEFAULT false,
  "isClinicalCare" BOOLEAN NOT NULL DEFAULT false,
  "supportedModes" TEXT[] DEFAULT ARRAY['CHAT', 'VOICE', 'VIDEO']::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "ProviderRoleDefinition"
("code", "label", "shortLabel", "category", "tone", "description", "scope", "bestFor", "notFor", "ctaLabel", "requiresCredentials", "requiresListenerScreening", "isClinicalCare", "sortOrder") VALUES
('MENTAL_WELLNESS_PROFESSIONAL', 'Psychologist / mental wellness professional', 'Psychologist', 'PROFESSIONAL_CARE', 'professional', 'Qualified support for structured mental-wellness consultations.', 'Structured mental-wellness care within the provider''s qualifications.', ARRAY['anxiety or stress support','relationship concerns','structured counselling'], ARRAY['medical emergencies','instant diagnosis without assessment','psychiatric prescription'], 'Book consultation', true, false, true, 10),
('QUALIFIED_COUNSELLOR', 'Qualified counsellor', 'Counsellor', 'PROFESSIONAL_CARE', 'professional', 'Trained counselling support for emotional concerns and guided conversations.', 'Counselling support and practical coping guidance within the provider''s training.', ARRAY['emotional clarity','stress and relationship support','guided coping tools'], ARRAY['emergency crisis care','medicine or prescription advice','formal diagnosis'], 'Book counselling session', true, false, true, 20),
('PSYCHOLOGY_STUDENT_VOLUNTEER', 'Psychology student listener', 'Student listener', 'EMOTIONAL_LISTENER', 'student', 'Non-clinical listening, reflection, and emotional support.', 'Non-clinical support under Hope Hub guidance and escalation rules.', ARRAY['listening support','study stress','daily emotional check-ins'], ARRAY['diagnosis','therapy replacement','high-risk or emergency concerns'], 'Talk to a student listener', false, true, false, 30),
('PEER_SUPPORT_VOLUNTEER', 'Peer support listener', 'Peer listener', 'EMOTIONAL_LISTENER', 'listener', 'Safe, human conversation with a screened emotional support listener.', 'Non-clinical peer listening with escalation of safety concerns.', ARRAY['loneliness','breakup recovery','motivation and encouragement'], ARRAY['clinical treatment','diagnosis','crisis or emergency support'], 'Talk to a caring listener', false, true, false, 40),
('NLP_COACH', 'NLP coach', 'NLP coach', 'COACH_MENTOR', 'coach', 'Goal-focused coaching for reframing, habits, and confidence.', 'Coaching support, not clinical therapy or medical care.', ARRAY['confidence','habit change','goal clarity'], ARRAY['clinical diagnosis','emergency care','medical treatment'], 'Book coaching session', false, false, false, 50),
('LIFE_COACH', 'Life coach', 'Life coach', 'COACH_MENTOR', 'coach', 'Practical coaching for decisions, routines, and life direction.', 'Coaching support, not clinical therapy or medical care.', ARRAY['life direction','motivation','routine planning'], ARRAY['diagnosis','prescription','crisis intervention'], 'Book coaching session', false, false, false, 60),
('MEDITATION_BREATHWORK_GUIDE', 'Meditation / breathwork guide', 'Wellness guide', 'COACH_MENTOR', 'wellness', 'Guided relaxation, breathwork, mindfulness, and grounding support.', 'Wellness practice guidance, not a replacement for mental-health treatment.', ARRAY['relaxation','breathing practice','mindfulness routines'], ARRAY['acute panic emergency','clinical treatment','medical advice'], 'Book guided practice', false, false, false, 70),
('CAREER_STUDY_MENTOR', 'Career / study mentor', 'Career mentor', 'COACH_MENTOR', 'mentor', 'Mentoring for study pressure, focus, confidence, and career direction.', 'Mentoring and practical guidance, not clinical counselling.', ARRAY['study stress','career confusion','focus and planning'], ARRAY['clinical therapy','diagnosis','emergency support'], 'Book mentoring session', false, false, false, 80);

CREATE TABLE "ProviderRoleAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "doctorId" TEXT NOT NULL,
  "roleCode" TEXT NOT NULL,
  "status" "ProviderRoleAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "credentialStatus" "CredentialVerificationStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "assignedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderRoleAssignment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProviderRoleAssignment_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "ProviderRoleDefinition"("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "CareTeamService" ADD COLUMN "providerRoleCode" TEXT;
UPDATE "CareTeamService" SET "providerRoleCode" = "providerRole"::TEXT WHERE "providerRole" IS NOT NULL;
UPDATE "CareTeamService" service
SET "providerRoleCode" = profile."careTeamType"::TEXT
FROM "MentalHealthProviderProfile" profile
WHERE service."mentalHealthProfileId" = profile."id" AND service."providerRoleCode" IS NULL;
ALTER TABLE "CareTeamService" ALTER COLUMN "providerRoleCode" SET NOT NULL;
ALTER TABLE "CareTeamService" ADD CONSTRAINT "CareTeamService_providerRoleCode_fkey" FOREIGN KEY ("providerRoleCode") REFERENCES "ProviderRoleDefinition"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ProviderRoleAssignment" ("id", "doctorId", "roleCode", "status", "isPrimary", "credentialStatus")
SELECT md5(profile."doctorId" || ':' || roles."roleEnum"::TEXT), profile."doctorId", roles."roleEnum"::TEXT,
  'ACTIVE', roles."roleEnum" = profile."careTeamType",
  CASE WHEN definition."requiresCredentials" THEN 'PENDING'::"CredentialVerificationStatus" ELSE 'NOT_REQUIRED'::"CredentialVerificationStatus" END
FROM "MentalHealthProviderProfile" profile
CROSS JOIN LATERAL unnest(ARRAY[profile."careTeamType"] || profile."careTeamTypes") AS roles("roleEnum")
JOIN "ProviderRoleDefinition" definition ON definition."code" = roles."roleEnum"::TEXT
ON CONFLICT DO NOTHING;

ALTER TABLE "Consultation" ADD COLUMN "providerRoleCode" TEXT;
ALTER TABLE "Consultation" ADD COLUMN "providerRoleSnapshot" JSONB;

CREATE INDEX "CareTeamService_providerRoleCode_isActive_idx" ON "CareTeamService"("providerRoleCode", "isActive");
CREATE INDEX "ProviderRoleDefinition_domain_isActive_sortOrder_idx" ON "ProviderRoleDefinition"("domain", "isActive", "sortOrder");
CREATE INDEX "ProviderRoleDefinition_category_isActive_idx" ON "ProviderRoleDefinition"("category", "isActive");
CREATE UNIQUE INDEX "ProviderRoleAssignment_doctorId_roleCode_key" ON "ProviderRoleAssignment"("doctorId", "roleCode");
CREATE INDEX "ProviderRoleAssignment_doctorId_status_isPrimary_idx" ON "ProviderRoleAssignment"("doctorId", "status", "isPrimary");
CREATE INDEX "ProviderRoleAssignment_roleCode_status_idx" ON "ProviderRoleAssignment"("roleCode", "status");
CREATE UNIQUE INDEX "ProviderRoleAssignment_one_primary_active_per_doctor_idx" ON "ProviderRoleAssignment"("doctorId") WHERE "isPrimary" = true AND "status" = 'ACTIVE';
