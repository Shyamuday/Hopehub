import type { DetailFieldDef } from '@hopehub/platform-ui';
import type { HomeopathyApproach } from '../../models';

export const HOMEOPATHY_APPROACH_SUMMARY_FIELDS: DetailFieldDef<HomeopathyApproach>[] = [
  { label: 'Developed by', getValue: (m) => m.developedBy, omitWhenEmpty: true },
  { label: 'Primary focus', getValue: (m) => m.focus }
];
