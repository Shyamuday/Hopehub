export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'doctor.approve': 'Provider account activated',
  'doctor.reject': 'Provider account deactivated',
  'doctor.deactivate': 'Provider account deactivated',
  'doctor.suspend': 'Provider suspended',
  'doctor.unsuspend': 'Provider suspension removed',
  'doctor.status_change': 'Provider status changed',
  'doctor.create': 'Provider created',
  'doctor.update': 'Provider profile updated',
  'consultation.assign_doctor': 'Provider assigned to consultation'
};

export function formatAuditAction(action: string) {
  return AUDIT_ACTION_LABELS[action] || action;
}
