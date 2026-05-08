import { type HomeopathyApproach } from '../../interfaces';

export const boenninghausenMethodApproach: HomeopathyApproach = {
  slug: 'boenninghausen-method',
  title: 'Boenninghausen Method',
  developedBy: 'Clemens von Boenninghausen',
  shortDescription: 'Emphasizes complete symptom structure and modalities for remedy differentiation.',
  focus: 'Modality-rich analysis with structured symptom completeness.',
  bestFor: ['Cases with strong modalities', 'Partial symptom sets', 'Analytical repertory workflows'],
  processSteps: ['Build complete symptom schema', 'Prioritize modalities', 'Cross-link generals and particulars', 'Finalize remedy'],
  strengths: ['Excellent modality handling', 'Systematic symptom construction'],
  limits: ['Documentation quality must be high']
};
