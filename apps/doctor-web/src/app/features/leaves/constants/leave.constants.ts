export const LEAVE_TYPES = [
  'CASUAL',
  'SICK',
  'EARNED',
  'UNPAID',
  'MATERNITY',
  'PATERNITY'
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

export const DEFAULT_LEAVE_TYPE: LeaveType = 'CASUAL';

export const LEAVE_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c' },
  APPROVED: { bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
  REJECTED: { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  CANCELLED: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' }
};

export const LEAVE_STATUS_FALLBACK_STYLE = {
  bg: 'rgba(255,255,255,0.06)',
  color: '#94a3b8'
} as const;
