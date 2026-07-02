import type { LeaveType } from '../../models';

export const LEAVE_TYPE_ICONS: Record<LeaveType, string> = {
  CASUAL: '📅',
  SICK: '🤒',
  EARNED: '⭐',
  UNPAID: '💸',
  MATERNITY: '👶',
  PATERNITY: '👨‍👶'
};

export const LEAVE_TYPE_FALLBACK_ICON = '📋';

export const LEAVE_STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' }
] as const;

export const LEAVE_STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  CANCELLED: 'badge-cancelled'
};

export const LEAVE_STATUS_BADGE_FALLBACK = 'badge-cancelled';

export const LEAVE_TYPES = [
  'CASUAL',
  'SICK',
  'EARNED',
  'UNPAID',
  'MATERNITY',
  'PATERNITY'
] as const;

export function leaveStatusBadgeClass(status: string): string {
  return LEAVE_STATUS_BADGE_CLASSES[status] ?? LEAVE_STATUS_BADGE_FALLBACK;
}

export function leaveTypeIcon(type: LeaveType): string {
  return LEAVE_TYPE_ICONS[type] ?? LEAVE_TYPE_FALLBACK_ICON;
}
