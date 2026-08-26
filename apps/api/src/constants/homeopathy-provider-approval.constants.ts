export const HOMEOPATHY_PROFILE_DRAFT_REASON =
  'Complete your homeopathy profile before credential review.';
export const HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX = 'Awaiting homeopathy credential verification';
export const HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX =
  'Homeopathy credential verification needs changes';

export function isHomeopathyApprovalFlowSuspension(reason?: string | null): boolean {
  const normalized = reason?.trim().toLowerCase() || '';
  return [
    HOMEOPATHY_PROFILE_DRAFT_REASON,
    HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX,
    HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX
  ].some((prefix) => normalized.startsWith(prefix.toLowerCase()));
}

export function isHomeopathyCredentialReview(reason?: string | null): boolean {
  return Boolean(
    reason?.trim().toLowerCase().startsWith(HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX.toLowerCase())
  );
}

export function normalizeProfessionalRegistrationNumber(value?: string | null): string | null {
  const normalized =
    value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '') || '';
  return normalized.length >= 3 ? normalized : null;
}
