BEGIN;

CREATE TABLE "CareTeamServiceCatalogItem" (
  "id" TEXT NOT NULL,
  "applicableRoleCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareTeamServiceCatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareTeamServiceCatalogItem_isActive_sortOrder_idx"
  ON "CareTeamServiceCatalogItem"("isActive", "sortOrder");

CREATE INDEX "CareTeamServiceCatalogItem_isDefault_isActive_idx"
  ON "CareTeamServiceCatalogItem"("isDefault", "isActive");

INSERT INTO "CareTeamServiceCatalogItem"
  ("id", "applicableRoleCodes", "title", "description", "isDefault", "isActive", "sortOrder", "updatedAt")
VALUES
  ('service-mental-wellness', ARRAY['MENTAL_WELLNESS_PROFESSIONAL']::TEXT[], 'Mental wellness consultation', 'Structured mental-wellness support within the provider''s qualifications.', true, true, 10, CURRENT_TIMESTAMP),
  ('service-counselling', ARRAY['QUALIFIED_COUNSELLOR']::TEXT[], 'Counselling session', 'Guided counselling for emotional concerns, stress and life transitions.', true, true, 20, CURRENT_TIMESTAMP),
  ('service-student-listener', ARRAY['PSYCHOLOGY_STUDENT_VOLUNTEER']::TEXT[], 'Student listener session', 'Non-clinical listening and emotional support from a psychology student listener.', true, true, 30, CURRENT_TIMESTAMP),
  ('service-peer-listener', ARRAY['PEER_SUPPORT_VOLUNTEER']::TEXT[], 'Peer support session', 'A safe, non-clinical conversation with a peer support listener.', true, true, 40, CURRENT_TIMESTAMP),
  ('service-community-mentor', ARRAY['COMMUNITY_MENTOR']::TEXT[], 'Mentoring session', 'Practical guidance and encouragement from a community mentor.', true, true, 50, CURRENT_TIMESTAMP),
  ('service-life-coaching', ARRAY['LIFE_COACH']::TEXT[], 'Life coaching session', 'Coaching for goals, habits, decisions and personal growth.', true, true, 60, CURRENT_TIMESTAMP),
  ('service-emotional-support', ARRAY[]::TEXT[], 'Emotional support session', 'A supportive conversation focused on being heard and finding a way forward.', true, true, 70, CURRENT_TIMESTAMP),
  ('service-follow-up', ARRAY[]::TEXT[], 'Follow-up session', 'A continuation session for an existing support plan.', true, true, 80, CURRENT_TIMESTAMP),
  ('service-stress-anxiety', ARRAY[]::TEXT[], 'Stress and anxiety support', 'Support for stress, worry, overwhelm and practical coping.', true, true, 90, CURRENT_TIMESTAMP),
  ('service-grief-breakup', ARRAY[]::TEXT[], 'Grief and breakup support', 'Compassionate support through grief, loss and relationship endings.', true, true, 100, CURRENT_TIMESTAMP);

COMMIT;
