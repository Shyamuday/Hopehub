BEGIN;

UPDATE "SiteConfig"
SET "value" = E'❌ No private DMs to members. Immediate ban. No warnings. No review.\n❌ No abuse, bullying, harassment, hate speech, arguments, debates, or religious or political discussions.\n❌ No medical advice or diagnosis. Do not target, insult, or speak against the admin, admin decisions, the group, any religion, community, LGBT, or any member by name in the group chat or voice chat.\n❌ No spam, advertising, promotions, self-promotion, or solicitation of any kind.\n\n✅ Be kind, respectful, and supportive.\n✅ Respect everyone''s privacy and confidentiality.\n✅ Encourage healing and positive conversations.\n✅ Report problems to the admins.\n\nContact Admin Team via @Contacthopehubbot',
    "updatedAt" = NOW()
WHERE "key" = 'telegramGroupHelpRulesMessage';

COMMIT;
