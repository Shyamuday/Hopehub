ALTER TABLE "CareTeamPricingTemplate"
ADD COLUMN "applicableRoleCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

INSERT INTO "CareTeamPricingTemplate" (
  "id", "applicableRoleCodes", "title", "description", "pricingMode", "priceInPaise",
  "durationMinutes", "isFree", "isActive", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  seed.id, seed.roles, seed.title, seed.description,
  'FIXED'::"CareTeamServicePricingMode", seed.price, seed.minutes,
  false, true, seed.sort_order, NOW(), NOW()
FROM (
  VALUES
    ('pricing_mental_wellness_45', ARRAY['MENTAL_WELLNESS_PROFESSIONAL']::TEXT[], 'Mental wellness consultation', 'Structured support for anxiety, stress, mood, relationship, or emotional concerns.', 99900, 45, 10),
    ('pricing_counsellor_45', ARRAY['QUALIFIED_COUNSELLOR']::TEXT[], 'Counselling session', 'Supportive counselling for stress, relationships, self-esteem, grief, or life transitions.', 69900, 45, 20),
    ('pricing_student_listener_30', ARRAY['PSYCHOLOGY_STUDENT_VOLUNTEER']::TEXT[], 'Student listener support', 'Non-clinical listening and emotional support under Hope Hub safety guidelines.', 9900, 30, 30),
    ('pricing_peer_listener_30', ARRAY['PEER_SUPPORT_VOLUNTEER']::TEXT[], 'Peer support session', 'Non-clinical peer listening for venting, loneliness, breakup stress, and daily pressure.', 9900, 30, 40),
    ('pricing_nlp_coach_45', ARRAY['NLP_COACH']::TEXT[], 'Mindset coaching session', 'Goal-focused coaching for confidence, patterns, motivation, and personal clarity.', 79900, 45, 50),
    ('pricing_life_coach_45', ARRAY['LIFE_COACH']::TEXT[], 'Life coaching session', 'Coaching for decisions, habits, boundaries, direction, and personal growth.', 79900, 45, 60),
    ('pricing_breathwork_30', ARRAY['MEDITATION_BREATHWORK_GUIDE']::TEXT[], 'Breathwork and calming session', 'Guided breathing, grounding, and relaxation practice for emotional regulation.', 49900, 30, 70),
    ('pricing_career_mentor_30', ARRAY['CAREER_STUDY_MENTOR']::TEXT[], 'Career and study mentoring', 'Support for study pressure, career confusion, focus, planning, and confidence.', 49900, 30, 80)
) AS seed(id, roles, title, description, price, minutes, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "CareTeamPricingTemplate" existing WHERE existing."title" = seed.title
);
