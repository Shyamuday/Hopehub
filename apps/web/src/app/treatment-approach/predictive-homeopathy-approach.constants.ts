import { HomeopathyApproach } from '../models';

export const predictiveHomeopathyApproach: HomeopathyApproach = {
  slug: 'predictive-homeopathy',
  title: 'Predictive Homeopathy',
  developedBy: 'Prafull Vijayakar',
  shortDescription: 'Analyzes disease progression and pathology layers to guide staged prescribing.',
  focus: 'Longitudinal disease progression logic.',
  bestFor: ['Stage-wise chronic disease', 'Report-heavy follow-up cases'],
  processSteps: ['Review diagnosis and reports', 'Map disease stage', 'Select remedy strategy', 'Track progression timeline'],
  strengths: ['Useful for progression tracking', 'Supports staged decision making'],
  limits: ['Needs reliable serial clinical data'],
  uiFlow: ['Diagnosis + reports', 'Disease level mapping', 'Remedy', 'Follow-up tracking'],
  uiComponents: ['diagnosis-input', 'disease-stage-mapper', 'followup-tracker']
};
