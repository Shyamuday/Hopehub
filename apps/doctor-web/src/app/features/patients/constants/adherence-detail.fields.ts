import type { DetailFieldDef } from '@hopehub/platform-ui';

export type AdherenceSummaryData = {
  days: number;
  adherencePercent: number;
};

export type AdherenceDayTrend = {
  date: string;
  adherencePercent: number;
  total: number;
  taken: number;
  skipped: number;
  missed: number;
  pending: number;
};

export const ADHERENCE_SUMMARY_FIELDS: DetailFieldDef<AdherenceSummaryData>[] = [
  { label: 'Window', getValue: (d) => `${d.days} days` },
  { label: 'Adherence', getValue: (d) => `${d.adherencePercent}%` }
];

export const ADHERENCE_DAY_FIELDS: DetailFieldDef<AdherenceDayTrend>[] = [
  { label: 'Adherence', getValue: (d) => `${d.adherencePercent}%` }
];

export function adherenceTotalsText(totals: {
  total: number;
  taken: number;
  skipped: number;
  missed: number;
  pending: number;
}): string {
  return `Total: ${totals.total} | Taken: ${totals.taken} | Skipped: ${totals.skipped} | Missed: ${totals.missed} | Pending: ${totals.pending}`;
}

export function adherenceDayTotalsText(day: AdherenceDayTrend): string {
  return `Total: ${day.total} | Taken: ${day.taken} | Skipped: ${day.skipped} | Missed: ${day.missed} | Pending: ${day.pending}`;
}
