import type { DetailFieldDef } from '@hopehub/platform-ui';

export type SupportAccountDetail = {
  isActive: boolean;
  adherencePercent: number | null;
  adherenceTaken: number;
  adherenceTotal: number;
};

export const SUPPORT_ACCOUNT_FIELDS: DetailFieldDef<SupportAccountDetail>[] = [
  {
    label: 'Status',
    getValue: (a) => (a.isActive ? 'Active' : 'Inactive')
  },
  {
    label: 'Adherence',
    getValue: (a) =>
      `${a.adherencePercent ?? '—'}% (${a.adherenceTaken}/${a.adherenceTotal} taken)`
  }
];
