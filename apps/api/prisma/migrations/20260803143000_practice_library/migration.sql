CREATE TYPE "PracticeType" AS ENUM (
  'BREATHING',
  'MINDFULNESS',
  'PHYSICAL',
  'COGNITIVE',
  'RELAXATION',
  'GROUNDING',
  'JOURNALING',
  'VISUALIZATION',
  'YOGA',
  'PRANAYAMA',
  'MEDITATION',
  'SOMATIC',
  'MOBILITY',
  'AYURVEDA_LIFESTYLE',
  'SPIRITUAL_GROUNDING'
);

CREATE TYPE "PracticeDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

CREATE TYPE "PracticeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "Practice" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" "PracticeType" NOT NULL,
  "difficulty" "PracticeDifficulty" NOT NULL DEFAULT 'BEGINNER',
  "durationMinutes" INTEGER,
  "durationLabel" TEXT,
  "concernSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "steps" JSONB NOT NULL,
  "tips" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "whenToUse" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "contraindications" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "avoidIf" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "mediaUrl" TEXT,
  "audioUrl" TEXT,
  "videoUrl" TEXT,
  "youtubeUrl" TEXT,
  "telegramUrl" TEXT,
  "thumbnailUrl" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "sourceSystem" TEXT,
  "expertReviewed" BOOLEAN NOT NULL DEFAULT false,
  "expertReviewedBy" TEXT,
  "expertReviewedAt" TIMESTAMP(3),
  "safetyLevel" TEXT NOT NULL DEFAULT 'LOW',
  "status" "PracticeStatus" NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Practice_slug_key" ON "Practice"("slug");
CREATE INDEX "Practice_status_sortOrder_idx" ON "Practice"("status", "sortOrder");
CREATE INDEX "Practice_type_status_idx" ON "Practice"("type", "status");

CREATE TABLE "PracticeRecommendationRule" (
  "id" TEXT NOT NULL,
  "practiceId" TEXT NOT NULL,
  "assessmentType" TEXT,
  "concernSlug" TEXT,
  "minScore" INTEGER,
  "maxScore" INTEGER,
  "level" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 3,
  "routineSlot" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PracticeRecommendationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PracticeRecommendationRule_assessmentType_minScore_maxScore_idx"
ON "PracticeRecommendationRule"("assessmentType", "minScore", "maxScore");
CREATE INDEX "PracticeRecommendationRule_concernSlug_priority_idx"
ON "PracticeRecommendationRule"("concernSlug", "priority");
CREATE INDEX "PracticeRecommendationRule_practiceId_idx"
ON "PracticeRecommendationRule"("practiceId");

ALTER TABLE "PracticeRecommendationRule"
ADD CONSTRAINT "PracticeRecommendationRule_practiceId_fkey"
FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserPracticeSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "practiceId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationMinutes" INTEGER,
  "helpfulRating" INTEGER,
  "moodBefore" TEXT,
  "moodAfter" TEXT,
  "notes" TEXT,
  "source" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserPracticeSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserPracticeSession_userId_completedAt_idx"
ON "UserPracticeSession"("userId", "completedAt");
CREATE INDEX "UserPracticeSession_practiceId_completedAt_idx"
ON "UserPracticeSession"("practiceId", "completedAt");

ALTER TABLE "UserPracticeSession"
ADD CONSTRAINT "UserPracticeSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPracticeSession"
ADD CONSTRAINT "UserPracticeSession_practiceId_fkey"
FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Practice" (
  "id", "slug", "title", "shortDescription", "description", "type", "difficulty",
  "durationMinutes", "durationLabel", "concernSlugs", "categories", "benefits", "steps",
  "tips", "whenToUse", "contraindications", "avoidIf", "tags", "expertReviewed",
  "safetyLevel", "status", "sortOrder", "metadata", "updatedAt"
) VALUES
(
  'practice-nadi-shodhana-anxiety',
  'nadi-shodhana-for-anxiety',
  'Nadi Shodhana for Anxiety',
  'A gentle alternate-nostril breathing practice for anxious overthinking.',
  'A slow pranayama practice that supports steadier breathing and attention. It is meant for emotional regulation, not as a cure or replacement for care.',
  'PRANAYAMA',
  'BEGINNER',
  6,
  '5-7 minutes',
  ARRAY['anxiety', 'panic', 'overthinking', 'stress'],
  ARRAY['Anxiety', 'Stress', 'Sleep'],
  ARRAY['Supports calmer breathing', 'Creates a pause before reacting', 'Helps settle racing thoughts'],
  '[{"stepNumber":1,"instruction":"Sit upright with relaxed shoulders. Keep the breath natural for 30 seconds."},{"stepNumber":2,"instruction":"Close the right nostril gently and inhale through the left nostril."},{"stepNumber":3,"instruction":"Close the left nostril, open the right, and exhale slowly."},{"stepNumber":4,"instruction":"Inhale through the right nostril, switch, and exhale through the left."},{"stepNumber":5,"instruction":"Continue slowly without breath retention for 5 minutes."},{"stepNumber":6,"instruction":"Release the hand and breathe normally before standing up."}]'::jsonb,
  ARRAY['Keep it soft; no force or breath holding.', 'Stop if dizzy or uncomfortable.'],
  ARRAY['Before a stressful call', 'When thoughts are racing', 'Evening wind-down'],
  ARRAY['Avoid during acute breathlessness or dizziness.', 'Do not add breath retention without a trained teacher.'],
  ARRAY['dizziness', 'acute breathing difficulty'],
  ARRAY['pranayama', 'nadi-shodhana', 'anxiety', 'indian-system'],
  false,
  'LOW',
  'PUBLISHED',
  10,
  '{"system":"yoga","disclaimer":"Supportive practice only; not a diagnosis or treatment."}'::jsonb,
  NOW()
),
(
  'practice-heartbreak-grounding-yoga',
  'heartbreak-grounding-yoga',
  'Heartbreak Grounding Yoga',
  'A low-intensity yoga sequence for breakup heaviness and emotional attachment.',
  'A gentle body practice for moments when heartbreak feels heavy. The sequence focuses on safety, grounding, and returning attention to the present.',
  'YOGA',
  'BEGINNER',
  12,
  '10-12 minutes',
  ARRAY['breakup', 'relationship', 'loneliness', 'depression'],
  ARRAY['Breakup Recovery', 'Relationship', 'Depression'],
  ARRAY['Grounds emotional overwhelm', 'Releases chest and shoulder tension', 'Supports self-compassion'],
  '[{"stepNumber":1,"instruction":"Begin in child pose or a seated forward fold for 90 seconds."},{"stepNumber":2,"instruction":"Move through slow cat-cow for 8 rounds."},{"stepNumber":3,"instruction":"Sit tall and roll shoulders back and down for 1 minute."},{"stepNumber":4,"instruction":"Lie down with knees bent and one hand on the chest for 3 minutes."},{"stepNumber":5,"instruction":"Place legs on a chair or wall and breathe slowly for 4 minutes."},{"stepNumber":6,"instruction":"Sit up and name one supportive action you can take today."}]'::jsonb,
  ARRAY['Keep the practice gentle.', 'If memories become intense, open your eyes and look around the room.'],
  ARRAY['After emotional triggers', 'Before sleep', 'When you feel pulled to message someone impulsively'],
  ARRAY['Avoid poses that cause pain.', 'Pause if the practice increases panic or dissociation.'],
  ARRAY['acute injury', 'severe panic', 'dissociation'],
  ARRAY['yoga', 'breakup', 'grounding', 'somatic'],
  false,
  'LOW',
  'PUBLISHED',
  20,
  '{"system":"yoga","disclaimer":"Supportive emotional regulation practice."}'::jsonb,
  NOW()
),
(
  'practice-dinacharya-sleep-reset',
  'dinacharya-sleep-reset',
  'Dinacharya Sleep Reset',
  'A simple evening routine inspired by Indian daily-rhythm principles.',
  'A practical lifestyle routine for overthinking and irregular sleep. It uses rhythm, light, food timing, and calming practices in a non-medical way.',
  'AYURVEDA_LIFESTYLE',
  'BEGINNER',
  20,
  '15-20 minutes',
  ARRAY['sleep', 'overthinking', 'stress', 'burnout'],
  ARRAY['Sleep', 'Stress', 'Burnout'],
  ARRAY['Creates a predictable evening rhythm', 'Reduces late-night stimulation', 'Supports calmer sleep preparation'],
  '[{"stepNumber":1,"instruction":"Dim bright lights and keep the phone away from bed for 20 minutes."},{"stepNumber":2,"instruction":"Drink warm water or caffeine-free herbal tea if suitable for you."},{"stepNumber":3,"instruction":"Write tomorrow''s top three tasks on paper."},{"stepNumber":4,"instruction":"Do 6 minutes of slow exhale breathing."},{"stepNumber":5,"instruction":"Lie down and relax the jaw, shoulders, belly, and legs in order."}]'::jsonb,
  ARRAY['Repeat the same routine for a week before judging impact.', 'Keep it simple enough to do on difficult days.'],
  ARRAY['When sleep schedule is irregular', 'After work stress', 'When thoughts keep looping at night'],
  ARRAY['Avoid if any food or drink conflicts with your medical advice.'],
  ARRAY['medical fluid restrictions', 'doctor-advised diet limits'],
  ARRAY['ayurveda-lifestyle', 'sleep', 'routine', 'dinacharya'],
  false,
  'LOW',
  'PUBLISHED',
  30,
  '{"system":"ayurveda-inspired","disclaimer":"Lifestyle support, not medical advice."}'::jsonb,
  NOW()
);

INSERT INTO "PracticeRecommendationRule" (
  "practiceId", "assessmentType", "concernSlug", "minScore", "maxScore", "priority", "routineSlot", "notes", "updatedAt"
) VALUES
('practice-nadi-shodhana-anxiety', 'gad7', 'anxiety', 5, 21, 1, 'calm-now', 'Use for mild to severe anxiety if no breathing red flags.', NOW()),
('practice-heartbreak-grounding-yoga', 'breakup-recovery', 'breakup', 61, 160, 1, 'evening', 'Use when breakup distress or attachment is high.', NOW()),
('practice-dinacharya-sleep-reset', 'sleep', 'sleep', 11, 40, 1, 'evening', 'Use when sleep score suggests moderate difficulty.', NOW());
