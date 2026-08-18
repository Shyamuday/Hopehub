-- Restore the full Hope Hub welcome keyboard in the existing group configuration.
-- Welcome media remains unchanged; only the saved button grid is updated.
UPDATE "SiteConfig"
SET
  "value" = E'Support | https://hopehub.in/#live-connect | success && Confess | https://t.me/Hopehubconfessionbot | danger\nChannel | https://t.me/HopeHubGlobal | primary && Website | https://hopehub.in/ | success\nWeb bot | https://t.me/Hopehubwebbot | primary && Rules | https://t.me/HHrules | primary',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'telegramGroupHelpWelcomeButtons';
