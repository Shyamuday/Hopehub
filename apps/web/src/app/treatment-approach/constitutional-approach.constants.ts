import { HomeopathyApproach } from '../models';

export const constitutionalApproach: HomeopathyApproach = {
  slug: 'constitutional',
  title: 'Constitutional Homeopathy',
  shortDescription:
    'A whole-person approach that prioritizes mind-body constitution, recurring tendencies, and long-term susceptibility patterns.',
  focus: 'Treat the patient constitution, not just the isolated disease label.',
  bestFor: ['Recurring diseases', 'Multi-system chronic conditions', 'Long-term relapse prevention'],
  processSteps: [
    'Build broad constitutional profile',
    'Identify recurring symptom themes over time',
    'Correlate mental-emotional and physical generals',
    'Select remedy based on totality and constitution',
    'Monitor deep response across follow-up cycles'
  ],
  strengths: ['Useful for chronic relapsing patterns', 'Supports individualized remedy selection'],
  limits: ['Response may take longer in advanced pathology', 'Requires detailed follow-up and patient adherence']
};
