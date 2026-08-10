export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'doctor.approve': 'Provider approved',
  'doctor.reject': 'Provider rejected',
  'doctor.status_change': 'Provider status changed',
  'doctor.create': 'Provider created',
  'doctor.update': 'Provider profile updated',
  'consultation.assign_doctor': 'Provider assigned to consultation'
};

export function formatAuditAction(action: string) {
  return AUDIT_ACTION_LABELS[action] || action;
}
