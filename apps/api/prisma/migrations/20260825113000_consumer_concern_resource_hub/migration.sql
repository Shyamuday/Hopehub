BEGIN;

CREATE TABLE "ConsumerConcern" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shortLabel" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "searchTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceSearchTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assessmentId" TEXT NOT NULL,
    "assessmentLabel" TEXT NOT NULL,
    "supportPath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showOnHome" BOOLEAN NOT NULL DEFAULT true,
    "showInResourceHub" BOOLEAN NOT NULL DEFAULT true,
    "showInSupportGuide" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsumerConcern_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsumerConcern_key_key" ON "ConsumerConcern"("key");
CREATE UNIQUE INDEX "ConsumerConcern_slug_key" ON "ConsumerConcern"("slug");
CREATE INDEX "ConsumerConcern_isActive_sortOrder_idx" ON "ConsumerConcern"("isActive", "sortOrder");
CREATE INDEX "ConsumerConcern_showOnHome_isActive_sortOrder_idx" ON "ConsumerConcern"("showOnHome", "isActive", "sortOrder");

ALTER TABLE "BlogPost" ADD COLUMN "concernSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "BlogPost"
SET "concernSlugs" = ARRAY_REMOVE(ARRAY[
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'anxiety|worry|overthink|nervous' THEN 'anxiety' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'depress|low mood|hopeless' THEN 'depression' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'stress|pressure|overwhelm' THEN 'stress' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'breakup|heartbreak|closure' THEN 'breakup' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'sleep|insomnia|rest' THEN 'sleep' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'relationship|partner|marriage|couple' THEN 'relationship' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'burnout|work stress|exhaust' THEN 'burnout' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'panic|heart racing' THEN 'panic' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'social anxiety|fear of judgement|public speaking' THEN 'socialAnxiety' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'lonely|loneliness|isolat' THEN 'loneliness' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'self-esteem|self esteem|self-worth|confidence' THEN 'selfEsteem' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'anger|rage|temper|irritab' THEN 'anger' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'grief|bereavement|loss' THEN 'grief' END,
  CASE WHEN LOWER("title" || ' ' || "excerpt" || ' ' || "category") ~ 'wellbeing|well-being|wellness|mindful' THEN 'wellbeing' END
]::TEXT[], NULL);

INSERT INTO "ConsumerConcern" (
  "id", "key", "slug", "label", "shortLabel", "description", "searchTerms",
  "serviceSearchTerms", "assessmentId", "assessmentLabel", "supportPath", "showOnHome", "sortOrder"
) VALUES
  ('concern-anxiety', 'anxiety', 'anxiety', 'Anxiety', 'Anxiety', 'Understand persistent worry, nervousness and overthinking, then choose a practical next step.', ARRAY['anxiety','worry','overthinking','fear','nervous'], ARRAY['anxiety','worry','overthinking','panic','calm'], 'gad7', 'Take anxiety test', 'PROFESSIONAL_CARE', true, 10),
  ('concern-depression', 'depression', 'depression', 'Low mood', 'Depression', 'Find support for low mood, hopelessness, loss of interest and emotional exhaustion.', ARRAY['depression','depressed','low mood','sad','hopeless','empty','mood'], ARRAY['depression','low mood','sad','mood','emotional support'], 'phq9', 'Take depression test', 'PROFESSIONAL_CARE', true, 20),
  ('concern-stress', 'stress', 'stress', 'Stress', 'Stress', 'Reduce pressure and overwhelm with self-checks, guided practices and human support.', ARRAY['stress','pressure','tension','overwhelm'], ARRAY['stress','pressure','overwhelm','burnout','work stress'], 'pss10', 'Take stress test', 'PROFESSIONAL_CARE', true, 30),
  ('concern-breakup', 'breakup', 'breakup-recovery', 'Breakup recovery', 'Breakup', 'Navigate heartbreak, no-contact decisions and recovery without facing it alone.', ARRAY['breakup','heartbreak','no contact','closure'], ARRAY['breakup','heartbreak','relationship ending','closure'], 'breakup-recovery', 'Take breakup recovery test', 'EMOTIONAL_LISTENER', true, 40),
  ('concern-sleep', 'sleep', 'sleep', 'Sleep concerns', 'Sleep', 'Explore emotional and behavioural factors that may be making rest difficult.', ARRAY['sleep','insomnia','night','rest'], ARRAY['sleep','insomnia','overthinking','night','rest'], 'sleep', 'Take sleep test', 'PROFESSIONAL_CARE', true, 50),
  ('concern-relationship', 'relationship', 'relationships', 'Relationship concerns', 'Relationships', 'Get support with trust, communication, conflict, partnerships and marriage.', ARRAY['relationship','couple','partner','marriage','trust','communication'], ARRAY['relationship','couple','partner','marriage','trust','communication'], 'relationship', 'Take relationship test', 'PROFESSIONAL_CARE', true, 60),
  ('concern-burnout', 'burnout', 'burnout', 'Burnout', 'Burnout', 'Recognise exhaustion and work pressure, and build a realistic recovery plan.', ARRAY['burnout','work stress','exhausted','professional stress'], ARRAY['burnout','work stress','exhausted','professional stress','career'], 'burnout', 'Take burnout test', 'PROFESSIONAL_CARE', true, 70),
  ('concern-panic', 'panic', 'panic', 'Panic symptoms', 'Panic', 'Understand panic symptoms and find grounding tools and appropriate support.', ARRAY['panic','panic attack','palpitation','heart racing'], ARRAY['panic','panic attack','anxiety','heart racing'], 'panic-symptoms', 'Take panic symptoms test', 'PROFESSIONAL_CARE', true, 80),
  ('concern-social-anxiety', 'socialAnxiety', 'social-anxiety', 'Social anxiety', 'Social anxiety', 'Build confidence around judgement, social situations and public speaking.', ARRAY['social anxiety','fear of judgement','public speaking','shy','social fear'], ARRAY['social anxiety','confidence','public speaking','fear of judgement'], 'social-anxiety', 'Take social anxiety test', 'PROFESSIONAL_CARE', false, 90),
  ('concern-loneliness', 'loneliness', 'loneliness', 'Loneliness', 'Loneliness', 'Find safe connection and support when you feel isolated or unheard.', ARRAY['lonely','loneliness','isolated','connection'], ARRAY['lonely','loneliness','connection','emotional support'], 'loneliness', 'Take loneliness test', 'EMOTIONAL_LISTENER', true, 100),
  ('concern-self-esteem', 'selfEsteem', 'self-esteem', 'Self-esteem', 'Self-esteem', 'Work on confidence, self-worth and a kinder relationship with yourself.', ARRAY['self esteem','self-worth','confidence','worthless'], ARRAY['self esteem','self-worth','confidence','life coach'], 'self-esteem', 'Take self-esteem test', 'COACH_MENTOR', false, 110),
  ('concern-anger', 'anger', 'anger', 'Anger regulation', 'Anger', 'Notice anger patterns and learn safer ways to respond and communicate.', ARRAY['anger','irritated','irritation','rage','temper'], ARRAY['anger','irritation','rage','temper','emotional regulation'], 'anger-regulation', 'Take anger test', 'PROFESSIONAL_CARE', false, 120),
  ('concern-grief', 'grief', 'grief', 'Grief support', 'Grief', 'Find compassionate support while processing bereavement, change and loss.', ARRAY['grief','loss','bereavement'], ARRAY['grief','loss','bereavement','emotional support'], 'grief-support', 'Take grief support test', 'EMOTIONAL_LISTENER', false, 130),
  ('concern-wellbeing', 'wellbeing', 'wellbeing', 'Wellbeing', 'Wellbeing', 'Strengthen everyday emotional wellbeing, mindfulness and healthy routines.', ARRAY['wellbeing','well-being','wellness','happiness'], ARRAY['wellbeing','wellness','happiness','life coach','mindfulness'], 'who5', 'Take wellbeing test', 'COACH_MENTOR', false, 140),
  ('concern-general', 'general', 'mental-health', 'Mental health', 'General', 'Start here when you are unsure which concern best describes what you are experiencing.', ARRAY['mental health','support','counselling','therapy'], ARRAY['mental health','support','counselling','therapy'], 'dass21', 'Take mental health test', 'PROFESSIONAL_CARE', false, 150);

COMMIT;
