type ClaimedCampaign = { campaign: { id: string } };

/** Drain due campaigns independently: one failed post cannot block its peers. */
export async function drainDueTelegramCampaigns<T extends ClaimedCampaign>(input: {
  claim: () => Promise<T | null>;
  deliver: (campaign: T) => Promise<unknown>;
  onError: (campaign: T, error: unknown) => void;
  limit: number;
}) {
  let attempted = 0;
  while (attempted < input.limit) {
    const campaign = await input.claim();
    if (!campaign) break;
    attempted++;
    try {
      await input.deliver(campaign);
    } catch (error) {
      input.onError(campaign, error);
    }
  }
  return attempted;
}
