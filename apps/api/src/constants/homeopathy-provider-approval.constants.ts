export const HOMEOPATHY_PROFILE_DRAFT_REASON =
  'Complete your homeopathy profile before credential review.';
export const HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX = 'Awaiting homeopathy credential verification';
export const HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX =
  'Homeopathy credential verification needs changes';

const HOMEOPATHY_ONBOARDING_APPROVAL_STATES = new Set(['DRAFT', 'PENDING', 'CHANGES_REQUESTED']);

type ProviderSuspensionSummary = {
  providerDomain?: string | null;
  suspendedAt?: Date | string | null;
  suspendedReason?: string | null;
  approvalStatus?: string | null;
};

export function isHomeopathyApprovalFlowSuspension(reason?: string | null): boolean {
  const normalized = reason?.trim().toLowerCase() || '';
  return [
    HOMEOPATHY_PROFILE_DRAFT_REASON,
    HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX,
    HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX
  ].some((prefix) => normalized.startsWith(prefix.toLowerCase()));
}

/**
 * Homeopathy providers must be able to authenticate while completing or correcting
 * credentials. These records use suspension fields to block clinical/public access,
 * but that onboarding lock is not an account suspension.
 */
export function isHomeopathyOnboardingSuspension(
  profile?: ProviderSuspensionSummary | null
): boolean {
  if (profile?.providerDomain !== 'HOMEOPATHY' || !profile.suspendedAt) return false;
  const reason = profile.suspendedReason?.trim() || '';
  return (
    isHomeopathyApprovalFlowSuspension(reason) ||
    (!reason && HOMEOPATHY_ONBOARDING_APPROVAL_STATES.has(profile.approvalStatus || ''))
  );
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
