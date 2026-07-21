import type { DetailFieldDef } from '@hopehub/platform-ui';

export type ConsultationBillingSummary = {
  billingPlanCode: string;
  amountInPaise: number;
};

function formatInr(paise: number) {
  return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export const CONSULTATION_BILLING_FIELDS: DetailFieldDef<ConsultationBillingSummary>[] = [
  { label: 'Plan', getValue: (c) => c.billingPlanCode },
  { label: 'Amount', getValue: (c) => formatInr(c.amountInPaise) }
];
