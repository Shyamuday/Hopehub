import { HomeopathyApproach } from '../models';

export const bogerMethodApproach: HomeopathyApproach = {
  slug: 'boger-method',
  title: 'Boger Method',
  developedBy: 'Cyrus Maxwell Boger',
  shortDescription: 'Combines pathology, modalities, and constitution in a pragmatic synthesis.',
  focus: 'Balanced integration of pathology and individuality.',
  bestFor: ['Mixed pathology-constitution cases', 'Practical chronic OPD workflows'],
  processSteps: ['Assess pathology level', 'Capture modalities', 'Integrate constitutional features', 'Select and monitor remedy'],
  strengths: ['Balanced and practical', 'Useful for real-world mixed cases'],
  limits: ['Still needs careful symptom hierarchy discipline']
};
