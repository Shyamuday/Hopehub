import { HomeopathyApproach } from '../models';

export const classicalHomeopathyApproach: HomeopathyApproach = {
  slug: 'classical-homeopathy-framework',
  title: 'Classical Homeopathy Framework',
  shortDescription:
    'The core doctrine-based model of individualized prescribing using totality, single remedy, and minimum dose principles.',
  focus: 'Treatment philosophy and prescribing principles, not just documentation format.',
  bestFor: ['Deep individualized prescribing', 'Constitutional chronic care', 'Long-term tendency correction'],
  processSteps: [
    'Take full individualized case history',
    'Prioritize characteristic symptoms and totality',
    'Select a single best-fit remedy',
    'Choose minimum effective potency/dose',
    'Observe response and repeat/change only when indicated'
  ],
  strengths: [
    'Strong individualized logic',
    'Clear doctrine for remedy and dose discipline',
    'Useful for long-term constitutional management'
  ],
  limits: [
    'Needs high practitioner skill and experience',
    'Can be slower in highly acute crisis settings'
  ]
};
