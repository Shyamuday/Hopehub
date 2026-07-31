UPDATE "HopeHubOffering"
SET
  "subtitle" = '30-minute private session with a 15-minute follow-up included.',
  "description" = 'A private 30-minute online session for focused support, clarity, and next steps, with one additional 15-minute follow-up check-in included for progress review and care continuity.',
  "benefits" = ARRAY[
    '30-minute private session',
    'Additional 15-minute follow-up session included',
    'Follow-up for progress review, questions, or next-step planning',
    'Online audio by default',
    'Simple next-step guidance'
  ],
  "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
    'primarySessionDurationMinutes', 30,
    'followUpSessionIncluded', true,
    'followUpSessionDurationMinutes', 15,
    'totalSupportMinutes', 45
  ),
  "updatedAt" = NOW()
WHERE "code" = 'SINGLE_30';
