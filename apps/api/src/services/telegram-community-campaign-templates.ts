export function shouldRefreshTelegramCampaignTemplate(
  existing: { source: string; templateVersion: number } | null,
  nextTemplateVersion: number
) {
  return (
    existing?.source === 'SYSTEM' && existing.templateVersion < Math.max(1, nextTemplateVersion)
  );
}
