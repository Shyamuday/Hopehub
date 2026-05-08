import { type HomeopathyApproach } from '../../interfaces';

export const protocolBasedApproach: HomeopathyApproach = {
  slug: 'protocol-based-prescribing',
  title: 'Protocol-Based Prescribing',
  shortDescription: 'Fixed or semi-fixed remedy pathways for specific disease labels in practical workflows.',
  focus: 'Speed and consistency for telemedicine and app-based delivery.',
  bestFor: ['MVP clinics', 'Routine high-volume consultations', 'Standard operating pathways'],
  processSteps: ['Pick condition', 'Apply protocol', 'Adjust for contraindications', 'Follow protocol review checkpoints'],
  strengths: ['Fast throughput', 'Easy to train teams'],
  limits: ['Lower personalization depth', 'Needs periodic protocol governance']
};
