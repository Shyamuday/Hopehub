import { HomeopathyApproach } from '../models';

export const sensationMethodApproach: HomeopathyApproach = {
  slug: 'sensation-method',
  title: 'Sensation Method',
  developedBy: 'Rajan Sankaran',
  shortDescription: 'Tracks patient expression and deep sensation themes to identify remedy kingdom patterns.',
  focus: 'Deep experiential narrative and sensation mapping.',
  bestFor: ['Complex chronic cases', 'Cases with rich narrative expression', 'Advanced specialist practice'],
  processSteps: ['Capture patient language', 'Extract repeated sensation themes', 'Map kingdom patterns', 'Select remedy family and final remedy'],
  strengths: ['High depth for complex chronic patterns', 'Popular modern method in India'],
  limits: ['High skill and time demand', 'Hard to standardize without training'],
  uiFlow: ['Patient expression capture', 'Sensation mapping', 'Kingdom identification', 'Remedy mapping'],
  uiComponents: ['free-text-capture', 'sensation-analyzer', 'kingdom-selector', 'remedy-map']
};
