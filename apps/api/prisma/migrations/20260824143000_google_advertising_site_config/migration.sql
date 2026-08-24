BEGIN;

INSERT INTO "SiteConfig" ("key", "value", "label", "updatedAt") VALUES
  ('googleAdsTagId', '', 'Google Ads tag ID', CURRENT_TIMESTAMP),
  ('googleAdsenseClientId', 'ca-pub-4932263295519623', 'Google AdSense publisher ID', CURRENT_TIMESTAMP),
  ('googleAdsConversionTelegram', '', 'Conversion label: Telegram', CURRENT_TIMESTAMP),
  ('googleAdsConversionBookingStarted', '', 'Conversion label: booking started', CURRENT_TIMESTAMP),
  ('googleAdsConversionPaymentSuccess', '', 'Conversion label: payment success', CURRENT_TIMESTAMP),
  ('googleAdsConversionLiveSupport', '', 'Conversion label: live support', CURRENT_TIMESTAMP),
  ('googleAdsConversionRegistration', '', 'Conversion label: registration', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

COMMIT;
