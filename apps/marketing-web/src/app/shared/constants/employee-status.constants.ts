export const EMPLOYEE_STATUS_BADGE_CLASSES: Record<string, string> = {
  ACTIVE: 'badge-active',
  ON_LEAVE: 'badge-on-leave',
  RESIGNED: 'badge-resigned',
  TERMINATED: 'badge-terminated'
};

export const EMPLOYEE_STATUS_BADGE_FALLBACK = 'badge-resigned';

export const EMPLOYEE_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On Leave' }
] as const;

export function employeeStatusBadgeClass(status: string): string {
  return EMPLOYEE_STATUS_BADGE_CLASSES[status] ?? EMPLOYEE_STATUS_BADGE_FALLBACK;
}
