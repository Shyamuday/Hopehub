import { type HomeopathyApproach } from '../../interfaces';

export const clinicalHomeopathyApproach: HomeopathyApproach = {
  slug: 'clinical-homeopathy',
  title: 'Clinical Homeopathy',
  shortDescription:
    'A diagnosis-led practical approach where common remedies are selected around disease patterns and dominant symptom clusters.',
  focus: 'Fast, practical decisions in routine OPD and acute-to-subacute scenarios.',
  bestFor: ['Busy clinical settings', 'Common disease entities', 'Time-limited consultations'],
  processSteps: [
    'Confirm diagnosis and dominant symptom picture',
    'Choose remedy set known for that clinical pattern',
    'Individualize with key modalities',
    'Reassess quickly and adjust potency/remedy if needed'
  ],
  strengths: ['Operationally simple', 'Works well when time is limited'],
  limits: ['Can underweight deeper constitutional factors', 'Less suited as a standalone long-term model']
};
