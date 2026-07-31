UPDATE "HopeHubOffering"
SET
  "subtitle" = '3-hour Goa wellness meetup with lifetime community support.',
  "description" = 'A premium in-person wellness meetup in Goa with guided group work, practical emotional wellness tools, peer connection, and lifetime Hope Hub community support through Telegram voice circles and chat. The format is designed for a small, supported group with one psychologist for every 10 participants.',
  "benefits" = ARRAY[
    '3-hour in-person wellness meetup in Goa',
    'Lifetime access to Hope Hub Telegram voice circle support',
    'Lifetime Telegram chat support for community check-ins and guidance',
    'Lifetime peer support group access with like-minded participants',
    'One psychologist assigned for every 10 participants',
    'Guided group reflection and emotional wellness exercises',
    'Practical tools for stress, overthinking, relationship pressure, and self-regulation',
    'Private sharing format with respectful group boundaries',
    'Post-meetup care direction and next-step planning',
    'Access to selected recorded audio/video support resources when shared by admin',
    'Priority updates for future Hope Hub meetups, workshops, and care programs',
    'Optional pathway to private counselling or care packages after the meetup'
  ],
  "audience" = ARRAY[
    'Individuals seeking deeper emotional support',
    'Working professionals managing stress or burnout',
    'People who want a safe peer wellness circle',
    'Users who value long-term community access',
    'Wellness seekers visiting or living near Goa'
  ],
  "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
    'supportModel', 'LIFETIME_COMMUNITY_SUPPORT',
    'psychologistRatio', '1 psychologist per 10 participants',
    'lifetimeTelegramVoiceCircle', true,
    'lifetimeTelegramChatSupport', true,
    'lifetimePeerGroupAccess', true
  ),
  "updatedAt" = NOW()
WHERE "code" = 'COMMUNITY_MEETUP';

UPDATE "HopeHubBanner"
SET
  "subtitle" = 'Goa meetup at ₹51,000 with 40% offer, lifetime Telegram voice, chat, and peer support.',
  "updatedAt" = NOW()
WHERE "id" = 'hope-banner-goa-meetup';
