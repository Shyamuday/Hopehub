import type { DetailFieldDef } from './detail-rows.types';
import { buildDetailRows } from './detail-rows.util';
import type { DetailRow } from './detail-rows.types';

export type HrLetterMeta = {
  referenceLabel: string;
  referenceNumber: string;
  issuedDate: string;
};

export const HR_LETTER_META_FIELDS: DetailFieldDef<HrLetterMeta>[] = [
  { label: 'Reference', getLabel: (m) => m.referenceLabel, getValue: (m) => m.referenceNumber },
  { label: 'Date', getValue: (m) => m.issuedDate }
];

export function hrLetterMetaRows(
  referenceLabel: string,
  referenceNumber: string,
  issuedDate: string
): DetailRow[] {
  return buildDetailRows({ referenceLabel, referenceNumber, issuedDate }, HR_LETTER_META_FIELDS);
}
