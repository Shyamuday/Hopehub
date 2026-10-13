import { createHash } from 'node:crypto';
export const campaignReference = (id: string) =>
  '~' + createHash('sha256').update(id).digest('hex').slice(0, 12);
export function resolveCampaignReference(reference: string, ids: string[]) {
  if (!reference.startsWith('~')) return reference;
  const matches = ids.filter((id) => campaignReference(id) === reference);
  if (matches.length !== 1)
    throw new Error('Schedule reference expired or is ambiguous. Open the post list again.');
  return matches[0];
}
