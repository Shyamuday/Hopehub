type SubmittedWebsiteLead = {
  id: string;
  visitorEmail: string | null;
};

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || '';
}

export function canAttachSubmittedWebsiteLead(
  lead: SubmittedWebsiteLead | null,
  verifiedEmail: string | null | undefined
): lead is SubmittedWebsiteLead {
  const normalizedVerifiedEmail = normalizeEmail(verifiedEmail);
  return Boolean(
    lead && normalizedVerifiedEmail && normalizeEmail(lead.visitorEmail) === normalizedVerifiedEmail
  );
}
