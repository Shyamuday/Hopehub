import type { EmployeeStatus, WorkShift } from '../../models';

export const SHIFT_LABELS: Record<WorkShift, string> = {
  MORNING: '🌅 Morning',
  AFTERNOON: '🌤️ Afternoon',
  EVENING: '🌆 Evening',
  NIGHT: '🌙 Night',
  FULL_DAY: '☀️ Full Day',
  CUSTOM: '⚙️ Custom'
};

export const EMPLOYEE_STATUS_STYLES: Record<EmployeeStatus, { bg: string; color: string }> = {
  ACTIVE: { bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
  ON_LEAVE: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c' },
  RESIGNED: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  TERMINATED: { bg: 'rgba(248,113,113,0.12)', color: '#f87171' }
};

export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;
