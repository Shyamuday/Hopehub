ALTER TABLE "CounsellorApplication"
ADD COLUMN "listenerScreeningAnswers" JSONB,
ADD COLUMN "listenerScreeningScore" INTEGER,
ADD COLUMN "listenerScreeningMaxScore" INTEGER,
ADD COLUMN "listenerScreeningPassed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "listenerScreeningCompletedAt" TIMESTAMP(3),
ADD COLUMN "listenerGuidelinesAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "listenerGuidelinesVersion" TEXT,
ADD COLUMN "listenerGuidelinesReadStartedAt" TIMESTAMP(3),
ADD COLUMN "listenerGuidelinesReadSeconds" INTEGER,
ADD COLUMN "listenerGuidelinesAcceptedAt" TIMESTAMP(3),
ADD COLUMN "listenerTrainingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "listenerTrainingVersion" TEXT,
ADD COLUMN "listenerTrainingCompletedAt" TIMESTAMP(3),
ADD COLUMN "listenerScreeningQuestionSetId" TEXT,
ADD COLUMN "listenerScreeningQuestionSetVersion" TEXT,
ADD COLUMN "autoApprovedAt" TIMESTAMP(3),
ADD COLUMN "autoApprovedDoctorUserId" TEXT;

CREATE INDEX "CounsellorApplication_listenerScreeningPassed_idx" ON "CounsellorApplication"("listenerScreeningPassed");
CREATE INDEX "CounsellorApplication_autoApprovedDoctorUserId_idx" ON "CounsellorApplication"("autoApprovedDoctorUserId");
CREATE INDEX "CounsellorApplication_listenerScreeningPassed_listenerScreeningCompletedAt_idx" ON "CounsellorApplication"("listenerScreeningPassed", "listenerScreeningCompletedAt");
CREATE INDEX "CounsellorApplication_listenerScreeningQuestionSetId_idx" ON "CounsellorApplication"("listenerScreeningQuestionSetId");

CREATE TABLE "ListenerScreeningQuestionSet" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Listener screening test',
  "version" TEXT NOT NULL,
  "description" TEXT,
  "passScore" INTEGER NOT NULL DEFAULT 16,
  "questions" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ListenerScreeningQuestionSet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListenerScreeningQuestionSet_version_key" ON "ListenerScreeningQuestionSet"("version");
CREATE INDEX "ListenerScreeningQuestionSet_isActive_publishedAt_idx" ON "ListenerScreeningQuestionSet"("isActive", "publishedAt");
CREATE INDEX "ListenerScreeningQuestionSet_createdById_idx" ON "ListenerScreeningQuestionSet"("createdById");
CREATE INDEX "ListenerScreeningQuestionSet_updatedById_idx" ON "ListenerScreeningQuestionSet"("updatedById");

INSERT INTO "ListenerScreeningQuestionSet" (
  "id", "title", "version", "description", "passScore", "questions", "isActive", "publishedAt", "createdAt", "updatedAt"
) VALUES (
  'listener-screening-default-v1',
  'Listener screening test',
  'listener-screening-v1-2026-08-07',
  'Default Hope Hub emotional support listener safety and boundary screening.',
  16,
  $json$[
    {"id":"boundaries-role","text":"A user asks you to become their therapist and make decisions for them. What should you do?","correctOptionId":"listen-and-boundary","options":[{"id":"take-control","text":"Take control so they feel safe."},{"id":"listen-and-boundary","text":"Listen supportively and explain your non-clinical listener boundary."},{"id":"give-diagnosis","text":"Diagnose their issue so they know what is happening."}]},
    {"id":"crisis-self-harm","text":"A user says they may harm themselves tonight. What is the best response?","correctOptionId":"escalate-immediately","options":[{"id":"keep-secret","text":"Promise secrecy and continue chatting casually."},{"id":"escalate-immediately","text":"Stay calm, encourage immediate emergency/crisis support, and escalate per Hope Hub safety process."},{"id":"wait-tomorrow","text":"Ask them to sleep and talk tomorrow."}]},
    {"id":"confidentiality-risk","text":"Which confidentiality statement is safest?","correctOptionId":"explain-limits","options":[{"id":"absolute-secret","text":"Everything is always secret, no matter what."},{"id":"explain-limits","text":"Privacy matters, but safety risks may need escalation to protect someone."},{"id":"share-team","text":"I can share your story anywhere in our team chat."}]},
    {"id":"diagnosis","text":"A user asks, “Do I have depression?” What should you say?","correctOptionId":"avoid-diagnosis","options":[{"id":"confirm-depression","text":"Yes, based on this chat you have depression."},{"id":"avoid-diagnosis","text":"I cannot diagnose, but I can listen and suggest professional assessment/support."},{"id":"ignore","text":"Ignore the question and change the topic."}]},
    {"id":"medication-advice","text":"A user asks whether to stop their medication. What do you do?","correctOptionId":"refer-professional","options":[{"id":"say-stop","text":"Tell them to stop if they feel better."},{"id":"refer-professional","text":"Do not advise; ask them to speak with their doctor/qualified professional."},{"id":"internet-dose","text":"Search online and suggest a dose."}]},
    {"id":"active-listening","text":"Which response shows active listening?","correctOptionId":"reflect-and-ask","options":[{"id":"compare-story","text":"That happened to me too; here is my whole story."},{"id":"reflect-and-ask","text":"It sounds exhausting. What part feels hardest right now?"},{"id":"fix-fast","text":"Just be positive and move on."}]},
    {"id":"judgement","text":"A user shares something embarrassing. Best listener response?","correctOptionId":"validate-without-judging","options":[{"id":"lecture","text":"Lecture them about why it was wrong."},{"id":"validate-without-judging","text":"Thank them for sharing and respond without shame or judgement."},{"id":"joke","text":"Make a joke to lighten it."}]},
    {"id":"dependency","text":"A user says they only want to talk to you and no one else. What is safest?","correctOptionId":"encourage-support-network","options":[{"id":"exclusive","text":"Agree to be their only support."},{"id":"encourage-support-network","text":"Support them while encouraging broader safe support and professional help if needed."},{"id":"block","text":"Block them immediately."}]},
    {"id":"privacy","text":"A user asks for your personal phone number/social media. What should you do?","correctOptionId":"no-personal-contact","options":[{"id":"share-number","text":"Share it if they seem trustworthy."},{"id":"no-personal-contact","text":"Keep communication on approved Hope Hub channels only."},{"id":"ask-theirs","text":"Ask for their personal social profile first."}]},
    {"id":"minor-safety","text":"A minor discloses a serious safety concern. What matters most?","correctOptionId":"follow-safeguarding","options":[{"id":"promise-secret","text":"Promise not to tell anyone."},{"id":"follow-safeguarding","text":"Follow safeguarding/escalation rules and involve appropriate support."},{"id":"give-punishment","text":"Tell them they will get punished."}]},
    {"id":"abuse-disclosure","text":"Someone discloses abuse. Best first approach?","correctOptionId":"validate-and-escalate","options":[{"id":"investigate","text":"Interrogate them for proof."},{"id":"validate-and-escalate","text":"Validate, avoid blame, and escalate/suggest safe professional or emergency support."},{"id":"confront","text":"Tell them to confront the abuser immediately."}]},
    {"id":"overpromising","text":"Which promise should a listener avoid?","correctOptionId":"clear-scope","options":[{"id":"clear-scope","text":"I can listen and support within Hope Hub safety boundaries."},{"id":"cure","text":"I will fix your anxiety completely."},{"id":"available","text":"I will be present during this session."}]},
    {"id":"triggered-listener","text":"You feel personally triggered during a chat. What should you do?","correctOptionId":"pause-and-supervise","options":[{"id":"push-through","text":"Push through even if you are overwhelmed."},{"id":"pause-and-supervise","text":"Pause safely, use supervision/escalation, and protect the user experience."},{"id":"snap","text":"Tell the user they upset you."}]},
    {"id":"cultural-sensitivity","text":"A user has beliefs different from yours. Best response?","correctOptionId":"ask-respectfully","options":[{"id":"correct-beliefs","text":"Correct their beliefs to match yours."},{"id":"ask-respectfully","text":"Ask respectfully and avoid assumptions."},{"id":"dismiss","text":"Dismiss what you do not understand."}]},
    {"id":"financial-request","text":"A user asks you for money or offers to pay you directly. What should you do?","correctOptionId":"decline-and-report","options":[{"id":"accept","text":"Accept if it is a small amount."},{"id":"decline-and-report","text":"Decline direct money exchange and report/escalate per policy."},{"id":"negotiate","text":"Negotiate outside Hope Hub."}]},
    {"id":"romantic-boundary","text":"A user becomes romantic/flirtatious with you. What is appropriate?","correctOptionId":"firm-boundary","options":[{"id":"flirt-back","text":"Flirt back if both are adults."},{"id":"firm-boundary","text":"Set a respectful boundary and keep the session supportive."},{"id":"meet","text":"Plan to meet outside the platform."}]},
    {"id":"data-notes","text":"What should session notes contain?","correctOptionId":"minimal-safe-notes","options":[{"id":"everything","text":"Every private detail and gossip."},{"id":"minimal-safe-notes","text":"Only minimal, relevant safety/support notes needed for continuity."},{"id":"screenshots","text":"Personal screenshots saved on your phone."}]},
    {"id":"high-risk-escalation","text":"If a user is high-risk but refuses help, what should you do?","correctOptionId":"warm-escalation","options":[{"id":"drop","text":"End the chat immediately."},{"id":"warm-escalation","text":"Stay supportive, encourage immediate help, and escalate using Hope Hub protocol."},{"id":"argue","text":"Argue until they agree."}]},
    {"id":"advice-giving","text":"A user asks, “Should I break up today?” What is safest?","correctOptionId":"support-choice","options":[{"id":"tell-breakup","text":"Tell them exactly what to do."},{"id":"support-choice","text":"Help them reflect on safety, feelings, options, and support — without deciding for them."},{"id":"avoid-topic","text":"Say relationship topics are not allowed."}]},
    {"id":"end-session","text":"How should you close a supportive chat?","correctOptionId":"summarize-next-step","options":[{"id":"vanish","text":"Disappear once time is over."},{"id":"summarize-next-step","text":"Summarize what was shared, offer grounding/next step, and remind them of support options."},{"id":"promise-daily","text":"Promise daily personal check-ins."}]}
  ]$json$::jsonb,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

CREATE TABLE "ListenerGuidelineReadSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "applicationTrack" "CounsellorApplicationTrack" NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "guidelinesVersion" TEXT NOT NULL,
  "minReadSeconds" INTEGER NOT NULL DEFAULT 120,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ListenerGuidelineReadSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListenerGuidelineReadSession_tokenHash_key" ON "ListenerGuidelineReadSession"("tokenHash");
CREATE INDEX "ListenerGuidelineReadSession_email_startedAt_idx" ON "ListenerGuidelineReadSession"("email", "startedAt");
CREATE INDEX "ListenerGuidelineReadSession_phone_startedAt_idx" ON "ListenerGuidelineReadSession"("phone", "startedAt");
CREATE INDEX "ListenerGuidelineReadSession_tokenHash_idx" ON "ListenerGuidelineReadSession"("tokenHash");
CREATE INDEX "ListenerGuidelineReadSession_expiresAt_idx" ON "ListenerGuidelineReadSession"("expiresAt");

CREATE TABLE "ListenerScreeningAttempt" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT,
  "questionSetId" TEXT,
  "questionSetVersion" TEXT,
  "applicationTrack" "CounsellorApplicationTrack" NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "maxScore" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL DEFAULT false,
  "guidelinesAccepted" BOOLEAN NOT NULL DEFAULT false,
  "guidelinesVersion" TEXT,
  "guidelinesReadSessionId" TEXT,
  "guidelinesReadSeconds" INTEGER,
  "trainingCompleted" BOOLEAN NOT NULL DEFAULT false,
  "trainingVersion" TEXT,
  "cooldownExpiresAt" TIMESTAMP(3),
  "source" TEXT NOT NULL DEFAULT 'healing-web',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ListenerScreeningAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListenerScreeningAttempt_email_createdAt_idx" ON "ListenerScreeningAttempt"("email", "createdAt");
CREATE INDEX "ListenerScreeningAttempt_phone_createdAt_idx" ON "ListenerScreeningAttempt"("phone", "createdAt");
CREATE INDEX "ListenerScreeningAttempt_passed_createdAt_idx" ON "ListenerScreeningAttempt"("passed", "createdAt");
CREATE INDEX "ListenerScreeningAttempt_cooldownExpiresAt_idx" ON "ListenerScreeningAttempt"("cooldownExpiresAt");
CREATE INDEX "ListenerScreeningAttempt_applicationId_idx" ON "ListenerScreeningAttempt"("applicationId");
CREATE INDEX "ListenerScreeningAttempt_questionSetId_idx" ON "ListenerScreeningAttempt"("questionSetId");
ALTER TABLE "ListenerScreeningAttempt" ADD CONSTRAINT "ListenerScreeningAttempt_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CounsellorApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ListenerScreeningAttempt" ADD CONSTRAINT "ListenerScreeningAttempt_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "ListenerScreeningQuestionSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "CareTeamService"
SET "priceInPaise" = 29900, "isFree" = false, "pricingMode" = 'FIXED'
WHERE "title" = 'Video listener support session';
