CREATE TYPE "LifestyleTipType" AS ENUM (
  'SLEEP',
  'NUTRITION',
  'EXERCISE',
  'SOCIAL',
  'WORK_LIFE_BALANCE',
  'ENVIRONMENT',
  'HABITS',
  'SELF_CARE',
  'DIGITAL_BOUNDARIES',
  'AYURVEDA_LIFESTYLE'
);

CREATE TYPE "LifestyleTipDifficulty" AS ENUM ('EASY', 'MODERATE', 'CHALLENGING');

CREATE TYPE "LifestyleTipStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "LifestyleTip" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" "LifestyleTipType" NOT NULL,
  "difficulty" "LifestyleTipDifficulty" NOT NULL DEFAULT 'EASY',
  "timeToImplement" TEXT NOT NULL,
  "concernSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "steps" JSONB NOT NULL,
  "tips" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "scientificBasis" TEXT,
  "commonMistakes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "progressTracking" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "relatedTipSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
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
  "expertReviewed" BOOLEAN NOT NULL DEFAULT false,
  "expertReviewedBy" TEXT,
  "expertReviewedAt" TIMESTAMP(3),
  "safetyLevel" TEXT NOT NULL DEFAULT 'LOW',
  "status" "LifestyleTipStatus" NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LifestyleTip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LifestyleTip_slug_key" ON "LifestyleTip"("slug");
CREATE INDEX "LifestyleTip_status_sortOrder_idx" ON "LifestyleTip"("status", "sortOrder");
CREATE INDEX "LifestyleTip_type_status_idx" ON "LifestyleTip"("type", "status");

CREATE TABLE "LifestyleTipRecommendationRule" (
  "id" TEXT NOT NULL,
  "lifestyleTipId" TEXT NOT NULL,
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

  CONSTRAINT "LifestyleTipRecommendationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifestyleTipRecommendationRule_assessmentType_minScore_maxScore_idx"
ON "LifestyleTipRecommendationRule"("assessmentType", "minScore", "maxScore");
CREATE INDEX "LifestyleTipRecommendationRule_concernSlug_priority_idx"
ON "LifestyleTipRecommendationRule"("concernSlug", "priority");
CREATE INDEX "LifestyleTipRecommendationRule_lifestyleTipId_idx"
ON "LifestyleTipRecommendationRule"("lifestyleTipId");

ALTER TABLE "LifestyleTipRecommendationRule"
ADD CONSTRAINT "LifestyleTipRecommendationRule_lifestyleTipId_fkey"
FOREIGN KEY ("lifestyleTipId") REFERENCES "LifestyleTip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserLifestyleTipSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lifestyleTipId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "helpfulRating" INTEGER,
  "notes" TEXT,
  "source" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserLifestyleTipSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserLifestyleTipSession_userId_completedAt_idx"
ON "UserLifestyleTipSession"("userId", "completedAt");
CREATE INDEX "UserLifestyleTipSession_lifestyleTipId_completedAt_idx"
ON "UserLifestyleTipSession"("lifestyleTipId", "completedAt");

ALTER TABLE "UserLifestyleTipSession"
ADD CONSTRAINT "UserLifestyleTipSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLifestyleTipSession"
ADD CONSTRAINT "UserLifestyleTipSession_lifestyleTipId_fkey"
FOREIGN KEY ("lifestyleTipId") REFERENCES "LifestyleTip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "LifestyleTip" (
  "id", "slug", "title", "shortDescription", "description", "type", "difficulty",
  "timeToImplement", "concernSlugs", "categories", "benefits", "steps", "tips",
  "scientificBasis", "commonMistakes", "progressTracking", "contraindications",
  "avoidIf", "tags", "expertReviewed", "safetyLevel", "status", "sortOrder", "metadata", "updatedAt"
) VALUES
(
  'lifestyle-digital-sunset-anxiety',
  'digital-sunset-for-anxiety',
  'Digital Sunset for Anxiety',
  'A phone boundary routine for anxious checking and late-night scrolling.',
  'A practical evening habit that reduces notification loops, comparison triggers, and late-night nervous-system activation.',
  'DIGITAL_BOUNDARIES',
  'EASY',
  '10 minutes setup, nightly repeat',
  ARRAY['anxiety', 'sleep', 'overthinking'],
  ARRAY['Anxiety', 'Sleep', 'Stress'],
  ARRAY['Reduces anxious checking', 'Improves bedtime consistency', 'Creates space for calmer routines'],
  '[{"stepNumber":1,"action":"Set a fixed phone parking place outside the bed area.","timeframe":"2 minutes"},{"stepNumber":2,"action":"Turn on Do Not Disturb for 45 minutes before sleep.","timeframe":"2 minutes"},{"stepNumber":3,"action":"Move social apps away from the first screen.","timeframe":"3 minutes"},{"stepNumber":4,"action":"Replace scrolling with one calming practice or paper note.","timeframe":"5 minutes"}]'::jsonb,
  ARRAY['Start with 20 minutes if 45 feels hard.', 'Use an alarm clock if your phone keeps pulling you back.'],
  'Evening screen exposure and notification checking can make relaxation harder. This is a behavioural support habit, not medical treatment.',
  ARRAY['Trying to remove all phone use at once', 'Keeping the phone beside the pillow'],
  ARRAY['Track nights completed', 'Rate sleep readiness from 1 to 5'],
  ARRAY['Do not use if you need your phone nearby for emergency caregiving without another alert plan.'],
  ARRAY['no emergency contact alternative'],
  ARRAY['digital-boundaries', 'anxiety', 'sleep', 'overthinking'],
  false,
  'LOW',
  'PUBLISHED',
  10,
  '{"disclaimer":"Lifestyle support only."}'::jsonb,
  NOW()
),
(
  'lifestyle-breakup-trigger-map',
  'breakup-trigger-map',
  'Breakup Trigger Map',
  'A simple plan to reduce avoidable reminders after heartbreak.',
  'Identify your top breakup triggers and choose one realistic boundary for each, without forcing yourself to erase your past.',
  'SELF_CARE',
  'MODERATE',
  '15 minutes',
  ARRAY['breakup', 'relationship', 'loneliness'],
  ARRAY['Breakup Recovery', 'Relationship'],
  ARRAY['Reduces emotional spirals', 'Makes no-contact easier', 'Builds self-protection without shame'],
  '[{"stepNumber":1,"action":"Write three triggers that repeatedly disturb you.","timeframe":"5 minutes"},{"stepNumber":2,"action":"For each trigger, write one boundary: mute, archive, avoid route, or ask a friend for support.","timeframe":"5 minutes"},{"stepNumber":3,"action":"Choose only one boundary to apply today.","timeframe":"3 minutes"},{"stepNumber":4,"action":"End by writing one replacement action for the trigger window.","timeframe":"2 minutes"}]'::jsonb,
  ARRAY['Start with muting rather than deleting if deletion feels too intense.', 'Ask for support if urges feel hard to control.'],
  'Trigger planning is a practical behavioural tool for reducing rumination and impulsive checking.',
  ARRAY['Making ten changes in one day', 'Using boundaries to punish yourself'],
  ARRAY['Track urge intensity before and after', 'Track whether the replacement action happened'],
  ARRAY['If triggers bring self-harm thoughts, seek immediate support.'],
  ARRAY['self-harm thoughts', 'high safety risk'],
  ARRAY['breakup', 'no-contact', 'triggers', 'self-care'],
  false,
  'MEDIUM',
  'PUBLISHED',
  20,
  '{"disclaimer":"Supportive self-care only."}'::jsonb,
  NOW()
),
(
  'lifestyle-morning-light-low-mood',
  'morning-light-low-mood',
  'Morning Light for Low Mood',
  'A tiny morning activation habit for low energy days.',
  'A small routine that uses daylight, hydration, and one easy task to help the day begin with less heaviness.',
  'HABITS',
  'EASY',
  '5-12 minutes',
  ARRAY['depression', 'burnout', 'general-wellbeing'],
  ARRAY['Depression', 'Burnout', 'General Well-being'],
  ARRAY['Supports daily rhythm', 'Makes activation feel smaller', 'Adds a reliable first win'],
  '[{"stepNumber":1,"action":"Open curtains or step near daylight as soon as practical.","timeframe":"1 minute"},{"stepNumber":2,"action":"Drink water or your usual morning drink slowly.","timeframe":"2 minutes"},{"stepNumber":3,"action":"Do one tiny task: wash face, make bed, or stand outside.","timeframe":"2-5 minutes"},{"stepNumber":4,"action":"Name the next smallest useful action.","timeframe":"1 minute"}]'::jsonb,
  ARRAY['Keep the task almost too easy.', 'Doing 20 percent still counts.'],
  'Light exposure and routine cues can support circadian rhythm and behavioural activation.',
  ARRAY['Waiting to feel motivated first', 'Choosing a task that is too large'],
  ARRAY['Track morning completed yes/no', 'Rate energy from 1 to 5'],
  ARRAY['Follow medical advice for light-sensitive conditions.'],
  ARRAY['light sensitivity'],
  ARRAY['low-mood', 'routine', 'activation', 'morning'],
  false,
  'LOW',
  'PUBLISHED',
  30,
  '{"disclaimer":"Not a replacement for treatment when depression is severe."}'::jsonb,
  NOW()
);

INSERT INTO "LifestyleTipRecommendationRule" (
  "lifestyleTipId", "assessmentType", "concernSlug", "minScore", "maxScore", "priority", "routineSlot", "notes", "updatedAt"
) VALUES
('lifestyle-digital-sunset-anxiety', 'gad7', 'anxiety', 5, 21, 1, 'evening', 'Use for anxiety with sleep disruption or overchecking.', NOW()),
('lifestyle-breakup-trigger-map', 'breakup-recovery', 'breakup', 61, 160, 1, 'anytime', 'Use when breakup triggers and no-contact difficulty are present.', NOW()),
('lifestyle-morning-light-low-mood', 'phq9', 'depression', 5, 27, 1, 'morning', 'Use for mild to severe low mood as a small activation step.', NOW());
