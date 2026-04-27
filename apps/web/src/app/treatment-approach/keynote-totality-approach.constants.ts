import { HomeopathyApproach } from '../models';

export const keynoteTotalityApproach: HomeopathyApproach = {
  slug: 'keynote-totality',
  title: 'Keynote + Totality Approach',
  shortDescription:
    'Combines striking keynote symptoms with the broader symptom totality to reduce prescribing errors.',
  focus: 'Balance precision clues with overall case coherence.',
  bestFor: ['Cases with one or two striking symptoms', 'Mixed acute-chronic patterns', 'When remedy differentiation is difficult'],
  processSteps: [
    'Identify rare, peculiar, and characteristic symptoms',
    'Cross-check with full totality for consistency',
    'Repertorize differentials',
    'Finalize remedy after materia medica confirmation'
  ],
  strengths: ['Improves remedy differentiation', 'Prevents overreliance on single symptom'],
  limits: ['Can become complex in poorly documented cases', 'Needs disciplined symptom hierarchy']
};
