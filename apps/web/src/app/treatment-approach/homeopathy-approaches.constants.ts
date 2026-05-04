import { HomeopathyApproach } from '../models';
import { banerjiProtocolsApproach } from './banerji-protocols-approach.constants';
import { boenninghausenMethodApproach } from './boenninghausen-method-approach.constants';
import { bogerMethodApproach } from './boger-method-approach.constants';
import { eightBoxCaseStructureApproach } from './classical-8-box-approach.constants';
import { classicalHomeopathyApproach } from './classical-homeopathy-approach.constants';
import { clinicalHomeopathyApproach } from './clinical-homeopathy-approach.constants';
import { constitutionalApproach } from './constitutional-approach.constants';
import { integratedHybridApproach } from './integrated-hybrid-approach.constants';
import { integrativeFollowUpApproach } from './integrative-follow-up-approach.constants';
import { kentianMethodApproach } from './kentian-method-approach.constants';
import { keynoteTotalityApproach } from './keynote-totality-approach.constants';
import { miasmaticApproach } from './miasmatic-approach.constants';
import { organonLmApproach } from './organon-lm-approach.constants';
import { pathologicalPrescribingApproach } from './pathological-prescribing-approach.constants';
import { predictiveHomeopathyApproach } from './predictive-homeopathy-approach.constants';
import { protocolBasedApproach } from './protocol-based-prescribing-approach.constants';
import { scholtenMethodApproach } from './scholten-method-approach.constants';
import { sehgalMethodApproach } from './sehgal-method-approach.constants';
import { sensationMethodApproach } from './sensation-method-approach.constants';

export const homeopathyApproaches: HomeopathyApproach[] = [
  classicalHomeopathyApproach,
  eightBoxCaseStructureApproach,
  organonLmApproach,
  constitutionalApproach,
  kentianMethodApproach,
  clinicalHomeopathyApproach,
  pathologicalPrescribingApproach,
  miasmaticApproach,
  keynoteTotalityApproach,
  integrativeFollowUpApproach,
  boenninghausenMethodApproach,
  bogerMethodApproach,
  sensationMethodApproach,
  scholtenMethodApproach,
  banerjiProtocolsApproach,
  predictiveHomeopathyApproach,
  sehgalMethodApproach,
  protocolBasedApproach,
  integratedHybridApproach
].map((approach) => ({
  ...approach,
  seo: {
    metaTitle: `${approach.title} | Vitalis Care and Research Centre`,
    metaDescription: approach.shortDescription,
    keywords: Array.from(
      new Set([
        approach.title,
        `${approach.slug} homeopathy`,
        'homeopathy method',
        'clinical homeopathy',
        'Vitalis Care and Research Centre',
        'doctor-led care',
        ...(approach.bestFor || []).slice(0, 4)
      ])
    ),
    ogTitle: `${approach.title} Approach | Vitalis Care and Research Centre`,
    ogDescription: approach.shortDescription,
    ...(approach.seo || {})
  }
}));
