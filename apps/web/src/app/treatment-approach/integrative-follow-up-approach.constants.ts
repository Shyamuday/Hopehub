import { HomeopathyApproach } from '../models';

export const integrativeFollowUpApproach: HomeopathyApproach = {
  slug: 'integrative-follow-up',
  title: 'Integrative Follow-up Approach',
  shortDescription:
    'Combines homeopathy with modern monitoring, risk flags, and referral logic for safer chronic digital care.',
  focus: 'Outcome tracking, safety screening, and continuity in tele-consultation workflows.',
  bestFor: ['Comorbid chronic patients', 'Telemedicine follow-up', 'Cases needing periodic reports and escalation'],
  processSteps: [
    'Establish baseline symptoms and diagnosis metrics',
    'Begin individualized homeopathy plan',
    'Track change with objective and subjective markers',
    'Use safety red flags for referral/escalation when needed'
  ],
  strengths: ['Better safety in digital chronic care', 'Improves accountability with measurable follow-up'],
  limits: ['Needs consistent patient data input', 'Requires clear referral network and triage protocol']
};
