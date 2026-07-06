/** Preset reasons when a visitor lead is marked not interested. */
export const NOT_INTERESTED_REASONS = [
  'Already under care elsewhere',
  'Too expensive / fee concern',
  'Not ready — will decide later',
  'Wrong number / not the right person',
  'Location / prefers in-person nearby',
  'Does not want online consultation',
  'No longer has the issue',
  'Other'
] as const;

export type NotInterestedReason = (typeof NOT_INTERESTED_REASONS)[number];

export function resolveNotInterestedReason(preset: string, detail?: string | null) {
  const trimmedPreset = preset.trim();
  if (!trimmedPreset) return null;
  if (trimmedPreset === 'Other') {
    const extra = detail?.trim();
    return extra ? `Other: ${extra}` : 'Other';
  }
  const extra = detail?.trim();
  return extra ? `${trimmedPreset} — ${extra}` : trimmedPreset;
}
