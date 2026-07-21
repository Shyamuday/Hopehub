import type { DetailFieldDef } from '@hopehub/platform-ui';

export type AdminDashboardStats = {
  revenueInPaise: number;
  activeDoctors: number;
  consultationsCount: number;
};

function formatInr(paise: number) {
  return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export const ADMIN_DASHBOARD_STAT_FIELDS: DetailFieldDef<AdminDashboardStats>[] = [
  { label: 'Revenue Collected', getValue: (s) => formatInr(s.revenueInPaise) },
  { label: 'Active Doctors', getValue: (s) => s.activeDoctors },
  { label: 'Consultations', getValue: (s) => s.consultationsCount }
];
