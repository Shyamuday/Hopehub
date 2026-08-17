-- Store optional CTA buttons with each campaign item. Keeping them with the
-- item means a campaign stays portable and editable without hard-coded URLs.
ALTER TABLE "TelegramCampaignItem" ADD COLUMN "buttons" JSONB;
