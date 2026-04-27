import { HomeopathyApproach } from '../models';

export const organonLmApproach: HomeopathyApproach = {
  slug: 'organon-lm',
  title: 'Organon-Based Method (6th Edition / LM Potency)',
  developedBy: 'Samuel Hahnemann',
  shortDescription: 'LM (Q) potency method with gentle and often repeatable dosing strategy.',
  focus: 'Controlled repetition with careful response monitoring.',
  bestFor: ['Sensitive patients', 'Long chronic follow-up', 'Cases requiring fine dose control'],
  processSteps: ['Establish baseline', 'Select LM remedy', 'Use gentle repetition protocol', 'Review response and adjust incrementally'],
  strengths: ['Gentle action profile', 'Flexible long-term dose management'],
  limits: ['Needs disciplined follow-up', 'Incorrect repetition can confuse case response']
};
