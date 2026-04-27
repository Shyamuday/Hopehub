import { HomeopathyApproach } from '../models';

export const integratedHybridApproach: HomeopathyApproach = {
  slug: 'integrated-hybrid',
  title: 'Integrated Hybrid Approach',
  shortDescription:
    'Real-world mix of clinical, constitutional, and modern methods with switchable approach modes by case need.',
  focus: 'Doctor flexibility with structured digital consistency.',
  bestFor: ['Internal doctor teams', 'Mixed complexity case loads', 'Scalable health-tech clinics'],
  processSteps: [
    'Start with practical clinical baseline',
    'Deepen into constitutional/sensation where needed',
    'Use protocol blocks for repeatable cases',
    'Escalate and switch method based on response'
  ],
  strengths: ['Most practical for modern clinics', 'Balances speed and depth'],
  limits: ['Needs clear SOP to avoid inconsistent switching'],
  uiFlow: ['Start clinical', 'Add constitutional depth', 'Add method notes', 'Switch mode as needed'],
  uiComponents: ['approach-switcher', 'multi-method-view']
};
