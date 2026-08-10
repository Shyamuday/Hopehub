export const AUDIT_ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'doctor.approve', label: 'Provider approved' },
  { value: 'doctor.reject', label: 'Provider rejected' },
  { value: 'doctor.status_change', label: 'Provider status changed' },
  { value: 'doctor.create', label: 'Provider created' },
  { value: 'doctor.update', label: 'Provider profile updated' },
  { value: 'consultation.assign_doctor', label: 'Consultation provider assigned' },
] as const;

export const AUDIT_TARGET_TYPE_OPTIONS = [
  { value: '', label: 'All targets' },
  { value: 'doctor', label: 'Provider' },
  { value: 'consultation', label: 'Consultation' },
] as const;

export const AUDIT_ACTION_LABELS: Record<string, string> = Object.fromEntries(
  AUDIT_ACTION_OPTIONS.filter((option) => option.value).map((option) => [
    option.value,
    option.label,
  ]),
);

export function formatAuditAction(action: string) {
  return AUDIT_ACTION_LABELS[action] || action;
}

export const AUDIT_PAGE_SIZE = 20;
