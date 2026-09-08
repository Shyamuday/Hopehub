BEGIN;

CREATE TYPE "EmailMarketingContactStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'UNSUBSCRIBED', 'SUPPRESSED');
CREATE TYPE "EmailSuppressionReason" AS ENUM ('UNSUBSCRIBED', 'HARD_BOUNCE', 'COMPLAINT', 'MANUAL');
CREATE TYPE "EmailCampaignAudience" AS ENUM ('REGISTERED_USERS', 'PROMOTIONAL_CONTACTS', 'ALL_ELIGIBLE');
CREATE TYPE "EmailCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'QUEUED', 'SENDING', 'COMPLETED', 'CANCELLED', 'FAILED');
CREATE TYPE "EmailCampaignRecipientStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED_SUPPRESSED', 'SKIPPED_REGISTERED', 'CANCELLED');

CREATE TABLE "EmailMarketingContact" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "normalizedEmail" TEXT NOT NULL,
  "name" TEXT,
  "sourceLabel" TEXT NOT NULL,
  "consentBasis" TEXT NOT NULL,
  "consentCapturedAt" TIMESTAMP(3) NOT NULL,
  "status" "EmailMarketingContactStatus" NOT NULL DEFAULT 'ACTIVE',
  "registeredUserId" TEXT,
  "importedById" TEXT,
  "convertedAt" TIMESTAMP(3),
  "unsubscribedAt" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailMarketingContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailSuppression" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "normalizedEmail" TEXT NOT NULL,
  "reason" "EmailSuppressionReason" NOT NULL,
  "source" TEXT,
  "suppressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailMarketingTemplate" (
  "id" TEXT NOT NULL,
  "systemKey" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "subject" TEXT NOT NULL,
  "previewText" TEXT,
  "htmlBody" TEXT NOT NULL,
  "textBody" TEXT NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailMarketingTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "previewText" TEXT,
  "htmlBody" TEXT NOT NULL,
  "textBody" TEXT NOT NULL,
  "audience" "EmailCampaignAudience" NOT NULL,
  "registeredRole" "Role",
  "templateId" TEXT,
  "status" "EmailCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMP(3),
  "queuedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "openedCount" INTEGER NOT NULL DEFAULT 0,
  "clickedCount" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailCampaignRecipient" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "normalizedEmail" TEXT NOT NULL,
  "name" TEXT,
  "userId" TEXT,
  "contactId" TEXT,
  "status" "EmailCampaignRecipientStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "firstOpenedAt" TIMESTAMP(3),
  "lastOpenedAt" TIMESTAMP(3),
  "openCount" INTEGER NOT NULL DEFAULT 0,
  "firstClickedAt" TIMESTAMP(3),
  "lastClickedAt" TIMESTAMP(3),
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "unsubscribedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailCampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailMarketingContact_normalizedEmail_key" ON "EmailMarketingContact"("normalizedEmail");
CREATE INDEX "EmailMarketingContact_status_createdAt_idx" ON "EmailMarketingContact"("status", "createdAt");
CREATE INDEX "EmailMarketingContact_registeredUserId_idx" ON "EmailMarketingContact"("registeredUserId");
CREATE INDEX "EmailMarketingContact_importedById_idx" ON "EmailMarketingContact"("importedById");
CREATE UNIQUE INDEX "EmailSuppression_normalizedEmail_key" ON "EmailSuppression"("normalizedEmail");
CREATE INDEX "EmailSuppression_reason_suppressedAt_idx" ON "EmailSuppression"("reason", "suppressedAt");
CREATE UNIQUE INDEX "EmailMarketingTemplate_systemKey_key" ON "EmailMarketingTemplate"("systemKey");
CREATE INDEX "EmailMarketingTemplate_isActive_sortOrder_idx" ON "EmailMarketingTemplate"("isActive", "sortOrder");
CREATE INDEX "EmailMarketingTemplate_category_isActive_idx" ON "EmailMarketingTemplate"("category", "isActive");
CREATE INDEX "EmailMarketingTemplate_createdById_idx" ON "EmailMarketingTemplate"("createdById");
CREATE INDEX "EmailCampaign_status_scheduledAt_idx" ON "EmailCampaign"("status", "scheduledAt");
CREATE INDEX "EmailCampaign_createdAt_idx" ON "EmailCampaign"("createdAt");
CREATE INDEX "EmailCampaign_createdById_idx" ON "EmailCampaign"("createdById");
CREATE INDEX "EmailCampaign_templateId_idx" ON "EmailCampaign"("templateId");
CREATE UNIQUE INDEX "EmailCampaignRecipient_campaignId_normalizedEmail_key" ON "EmailCampaignRecipient"("campaignId", "normalizedEmail");
CREATE INDEX "EmailCampaignRecipient_status_nextAttemptAt_idx" ON "EmailCampaignRecipient"("status", "nextAttemptAt");
CREATE INDEX "EmailCampaignRecipient_normalizedEmail_idx" ON "EmailCampaignRecipient"("normalizedEmail");
CREATE INDEX "EmailCampaignRecipient_campaignId_status_idx" ON "EmailCampaignRecipient"("campaignId", "status");
CREATE INDEX "EmailCampaignRecipient_userId_idx" ON "EmailCampaignRecipient"("userId");
CREATE INDEX "EmailCampaignRecipient_contactId_idx" ON "EmailCampaignRecipient"("contactId");

ALTER TABLE "EmailMarketingContact" ADD CONSTRAINT "EmailMarketingContact_registeredUserId_fkey" FOREIGN KEY ("registeredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailMarketingContact" ADD CONSTRAINT "EmailMarketingContact_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailMarketingTemplate" ADD CONSTRAINT "EmailMarketingTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailMarketingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "EmailMarketingContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "EmailMarketingTemplate" ("id", "systemKey", "name", "category", "description", "subject", "previewText", "htmlBody", "textBody", "isSystem", "sortOrder", "updatedAt") VALUES
('email-template-welcome', 'WELCOME', 'Welcome to Hope Hub', 'ONBOARDING', 'Welcome registered users and introduce the safest ways to start.', 'Welcome to Hope Hub, {{firstName}}', 'Your private space for practical wellbeing support is ready.', $html$<h1 style="font-size:28px;margin:0 0 16px">Welcome, {{firstName}}</h1><p style="font-size:16px;line-height:1.7">Hope Hub is here when you want practical resources, a private self-check, or a conversation with someone who can listen.</p><p><a href="https://hopehub.in/support" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Explore support options</a></p>$html$, $text$Welcome, {{firstName}}

Hope Hub is here when you want practical resources, a private self-check, or a conversation with someone who can listen.

Explore support options: https://hopehub.in/support$text$, true, 10, CURRENT_TIMESTAMP),
('email-template-support', 'BOOK_SUPPORT', 'Book private support', 'SUPPORT', 'A calm, direct invitation to find or book the right support.', 'Support is one step away, {{firstName}}', 'Choose a private support path without unnecessary delay.', $html$<h1 style="font-size:28px;margin:0 0 16px">You do not have to figure everything out alone</h1><p style="font-size:16px;line-height:1.7">Choose what you need and Hope Hub will guide you to a suitable support option. You can begin simply and decide the details afterward.</p><p><a href="https://hopehub.in/support" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Find support</a></p>$html$, $text$You do not have to figure everything out alone.

Choose what you need and Hope Hub will guide you to a suitable support option. You can begin simply and decide the details afterward.

Find support: https://hopehub.in/support$text$, true, 20, CURRENT_TIMESTAMP),
('email-template-assessment', 'ASSESSMENT', 'Wellbeing self-check', 'EDUCATION', 'Share Hope Hub self-assessments as an optional starting point.', 'A private wellbeing check-in for you', 'Take a short self-check and understand what support may help.', $html$<h1 style="font-size:28px;margin:0 0 16px">Take a moment to check in with yourself</h1><p style="font-size:16px;line-height:1.7">A short, private self-assessment can help you notice patterns and choose a useful next step. It is not a diagnosis and you can stop at any time.</p><p><a href="https://hopehub.in/assessments" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">View self-checks</a></p>$html$, $text$Take a moment to check in with yourself.

A short, private self-assessment can help you notice patterns and choose a useful next step. It is not a diagnosis and you can stop at any time.

View self-checks: https://hopehub.in/assessments$text$, true, 30, CURRENT_TIMESTAMP),
('email-template-community', 'COMMUNITY', 'Community invitation', 'COMMUNITY', 'Invite people to Hope Hub community spaces and peer activities.', 'You are invited to the Hope Hub community', 'Join a respectful space for conversations, activities, and support.', $html$<h1 style="font-size:28px;margin:0 0 16px">A supportive community is waiting</h1><p style="font-size:16px;line-height:1.7">Connect through respectful conversations, wellbeing activities, and community sessions. Participate at your own pace and protect your privacy.</p><p><a href="https://hopehub.in/community" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Explore the community</a></p>$html$, $text$A supportive community is waiting.

Connect through respectful conversations, wellbeing activities, and community sessions. Participate at your own pace and protect your privacy.

Explore the community: https://hopehub.in/community$text$, true, 40, CURRENT_TIMESTAMP),
('email-template-event', 'EVENT', 'Event or workshop announcement', 'EVENTS', 'A reusable announcement for workshops, webinars, or group sessions.', '{{firstName}}, join our next Hope Hub event', 'A practical session designed to support everyday wellbeing.', $html$<h1 style="font-size:28px;margin:0 0 16px">You are invited</h1><p style="font-size:16px;line-height:1.7"><strong>Add event title, date, and time here.</strong></p><p style="font-size:16px;line-height:1.7">Explain what participants will learn, who the session is for, and what they should expect.</p><p><a href="https://hopehub.in/events" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">View events</a></p>$html$, $text$You are invited.

Add event title, date, and time here.

Explain what participants will learn, who the session is for, and what they should expect.

View events: https://hopehub.in/events$text$, true, 50, CURRENT_TIMESTAMP);

COMMIT;
