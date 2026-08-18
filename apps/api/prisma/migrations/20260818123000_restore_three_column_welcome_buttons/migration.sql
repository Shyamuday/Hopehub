-- Keep the compact six-button welcome layout: three links per row.
UPDATE "SiteConfig"
SET
  "value" = E'Support | https://hopehub.in/#live-connect | success && Confess | https://t.me/Hopehubconfessionbot | danger && Channel | https://t.me/HopeHubGlobal | primary\nWebsite | https://hopehub.in/ | success && Web bot | https://t.me/Hopehubwebbot | primary && Rules | https://t.me/HHrules | primary',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'telegramGroupHelpWelcomeButtons';
