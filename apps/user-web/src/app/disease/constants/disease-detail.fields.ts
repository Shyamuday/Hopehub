import type { DetailFieldDef } from '@hopehub/platform-ui';
import type { DiseaseInfo } from '../../models';

export const DISEASE_QUICK_FACT_FIELDS: DetailFieldDef<DiseaseInfo>[] = [
  { label: 'Severity', getValue: (d) => d.severityLevel, omitWhenEmpty: true },
  { label: 'When to seek care', getValue: (d) => d.whenToSeeDoctor, omitWhenEmpty: true },
  { label: 'Expected duration', getValue: (d) => d.duration, omitWhenEmpty: true },
];

export const DISEASE_COMMON_IN_FIELDS: DetailFieldDef<NonNullable<DiseaseInfo['commonIn']>>[] = [
  { label: 'Age group', getValue: (c) => c.ageGroup, omitWhenEmpty: true },
  { label: 'Gender', getValue: (c) => c.gender, omitWhenEmpty: true },
];

export const DISEASE_REVIEW_FIELDS: DetailFieldDef<DiseaseInfo>[] = [
  { label: 'Reviewed by', getValue: (d) => d.reviewedBy, omitWhenEmpty: true },
  { label: 'Last updated', getValue: (d) => d.lastUpdated, omitWhenEmpty: true },
  {
    label: 'References',
    getValue: (d) => (d.references?.length ? d.references.join(', ') : ''),
    omitWhenEmpty: true,
  },
];

export const DISEASE_TREATMENT_OPTION_FIELDS: DetailFieldDef<
  NonNullable<DiseaseInfo['treatmentOptions']>
>[] = [
  { label: 'Allopathy', getValue: (o) => o.allopathy, omitWhenEmpty: true },
  { label: 'Ayurveda', getValue: (o) => o.ayurveda, omitWhenEmpty: true },
  { label: 'Homeopathy', getValue: (o) => o.homeopathy, omitWhenEmpty: true },
  { label: 'Lifestyle', getValue: (o) => o.lifestyle, omitWhenEmpty: true },
];
