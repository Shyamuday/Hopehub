import type { DetailFieldDef } from '@hopehub/platform-ui';

export type WorklistStatCounts = {
  assigned: number;
  inProgress: number;
  followUpDue: number;
};

export const WORKLIST_STAT_FIELDS: DetailFieldDef<WorklistStatCounts>[] = [
  { label: 'Assigned', getValue: (c) => c.assigned },
  { label: 'In progress', getValue: (c) => c.inProgress },
  { label: 'Follow-up due', getValue: (c) => c.followUpDue }
];

export type PaymentSummaryStats = {
  paidConsultations: number;
  pendingConsultations?: number;
  grossInPaise: number;
  estimatedDoctorEarningsInPaise: number;
  pendingEarningsInPaise?: number;
  doctorSharePercent: number;
};

function formatInr(paise: number) {
  return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export const PAYMENT_SUMMARY_STAT_FIELDS: DetailFieldDef<PaymentSummaryStats>[] = [
  { label: 'Paid Consultations', getValue: (s) => s.paidConsultations },
  { label: 'Pending Payments', getValue: (s) => s.pendingConsultations ?? 0 },
  { label: 'Gross Revenue', getValue: (s) => formatInr(s.grossInPaise) },
  {
    label: 'Your Earnings',
    getLabel: (s) => `Your Earnings (${s.doctorSharePercent}%)`,
    getValue: (s) => formatInr(s.estimatedDoctorEarningsInPaise)
  },
  {
    label: 'Pending Earnings',
    getValue: (s) => formatInr(s.pendingEarningsInPaise ?? 0)
  }
];
