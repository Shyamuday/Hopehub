import { PAGE_SIZES } from '../../../core/constants/pagination.constants';

export const PAYROLL_TYPE_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Providers', value: 'DOCTOR' },
  { label: 'Store Staff', value: 'STORE_STAFF' },
] as const;

export const PAYROLL_PAGE_SIZES = PAGE_SIZES;

export const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  DOCTOR: 'Provider',
  STORE_STAFF: 'Staff',
};

export const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#4ade80',
  ON_LEAVE: '#fb923c',
  RESIGNED: '#94a3b8',
  TERMINATED: '#f87171',
};

export function formatPaise(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function paiseToK(paise: number): string {
  const val = paise / 100;
  return val >= 100000
    ? `${(val / 100000).toFixed(1)}L`
    : val >= 1000
      ? `${(val / 1000).toFixed(1)}K`
      : String(Math.round(val));
}
