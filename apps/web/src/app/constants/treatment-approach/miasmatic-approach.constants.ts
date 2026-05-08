import { type HomeopathyApproach } from '../../interfaces';

export const miasmaticApproach: HomeopathyApproach = {
  slug: 'miasmatic',
  title: 'Miasmatic Layering Approach',
  shortDescription:
    'A chronic-case interpretation model that analyzes inherited/acquired disease tendencies and layered susceptibility.',
  focus: 'Understand deep chronic predisposition and recurrence patterns.',
  bestFor: ['Strong family history', 'Refractory chronic disease', 'Repeated relapses despite treatment'],
  processSteps: [
    'Analyze long-term case timeline and recurring themes',
    'Map probable miasmatic background from history',
    'Integrate constitutional and miasmatic remedy clues',
    'Sequence follow-up based on layer-wise response'
  ],
  strengths: ['Improves depth in chronic case understanding', 'Useful when straightforward prescribing fails'],
  limits: ['Conceptually advanced', 'Requires experienced interpretation and documentation quality']
};
