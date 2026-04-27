import { HomeopathyApproach } from '../models';

export const banerjiProtocolsApproach: HomeopathyApproach = {
  slug: 'banerji-protocols',
  title: 'Banerji Protocols',
  developedBy: 'Prasanta Banerji',
  shortDescription: 'Standardized protocol sets for specific diseases, designed for scale and repeatability.',
  focus: 'Protocol-driven prescribing for high-volume settings.',
  bestFor: ['Clinic scalability', 'Fast initial treatment pathways', 'Telemedicine ops'],
  processSteps: ['Select diagnosis', 'Load protocol set', 'Personalize if needed', 'Prescribe and track'],
  strengths: ['High scalability', 'Operational consistency'],
  limits: ['Less individualized than pure classical frameworks'],
  uiFlow: ['Select disease', 'Auto protocol suggestion', 'Optional modify', 'Prescribe'],
  uiComponents: ['protocol-selector', 'protocol-details', 'dose-scheduler']
};
