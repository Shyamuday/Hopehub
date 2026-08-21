export const CONSUMER_ROUTES = {
  paths: {
    home: '/',
    support: '/support',
    bookSupport: '/contact',
    services: '/services',
    assessments: '/assessments',
    careTeam: '/care-team',
    community: '/community',
    telegram: '/telegram',
    about: '/about',
    dashboard: '/dashboard',
    supportPlan: '/my-support-plan',
    profile: '/profile',
    exercises: '/exercises',
    lifestyleTips: '/lifestyle-tips',
    articles: '/articles',
    packages: '/packages',
    events: '/events',
    resources: '/resources',
    organization: '/organization',
    feedback: '/feedback',
    faq: '/faq',
    donate: '/donate',
    careers: '/careers',
    liveGroups: '/live-groups',
  },
  links: {
    home: ['/'],
    support: ['/support'],
    bookSupport: ['/contact'],
    services: ['/services'],
    assessments: ['/assessments'],
    careTeam: ['/care-team'],
    community: ['/community'],
    telegram: ['/telegram'],
    about: ['/about'],
    dashboard: ['/dashboard'],
    supportPlan: ['/my-support-plan'],
    profile: ['/profile'],
    exercises: ['/exercises'],
    lifestyleTips: ['/lifestyle-tips'],
    articles: ['/articles'],
    packages: ['/packages'],
    events: ['/events'],
    resources: ['/resources'],
    organization: ['/organization'],
    feedback: ['/feedback'],
    faq: ['/faq'],
    donate: ['/donate'],
    careers: ['/careers'],
    liveGroups: ['/live-groups'],
  },
  fragments: {
    liveConnect: 'live-connect',
  },
} as const;

export const CONSUMER_ASSESSMENT_IDS = {
  anxiety: 'gad7',
  depression: 'phq9',
  stress: 'pss10',
  breakup: 'breakup-recovery',
  sleep: 'sleep',
  relationship: 'relationship',
  burnout: 'burnout',
  wellbeing: 'who5',
  mentalHealth: 'dass21',
  panic: 'panic-symptoms',
  socialAnxiety: 'social-anxiety',
  loneliness: 'loneliness',
  selfEsteem: 'self-esteem',
  anger: 'anger-regulation',
  grief: 'grief-support',
} as const;

export type ConsumerAssessmentId =
  (typeof CONSUMER_ASSESSMENT_IDS)[keyof typeof CONSUMER_ASSESSMENT_IDS];

export type ConsumerAssessmentRouteMatch = {
  id: ConsumerAssessmentId;
  label: string;
  link: string[];
};

export const CONSUMER_ASSESSMENT_ROUTES: Record<
  keyof typeof CONSUMER_ASSESSMENT_IDS,
  ConsumerAssessmentRouteMatch
> = {
  anxiety: {
    id: CONSUMER_ASSESSMENT_IDS.anxiety,
    label: 'Take anxiety test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.anxiety],
  },
  depression: {
    id: CONSUMER_ASSESSMENT_IDS.depression,
    label: 'Take depression test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.depression],
  },
  stress: {
    id: CONSUMER_ASSESSMENT_IDS.stress,
    label: 'Take stress test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.stress],
  },
  breakup: {
    id: CONSUMER_ASSESSMENT_IDS.breakup,
    label: 'Take breakup recovery test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.breakup],
  },
  sleep: {
    id: CONSUMER_ASSESSMENT_IDS.sleep,
    label: 'Take sleep test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.sleep],
  },
  relationship: {
    id: CONSUMER_ASSESSMENT_IDS.relationship,
    label: 'Take relationship test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.relationship],
  },
  burnout: {
    id: CONSUMER_ASSESSMENT_IDS.burnout,
    label: 'Take burnout test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.burnout],
  },
  wellbeing: {
    id: CONSUMER_ASSESSMENT_IDS.wellbeing,
    label: 'Take wellbeing test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.wellbeing],
  },
  mentalHealth: {
    id: CONSUMER_ASSESSMENT_IDS.mentalHealth,
    label: 'Take mental health test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.mentalHealth],
  },
  panic: {
    id: CONSUMER_ASSESSMENT_IDS.panic,
    label: 'Take panic symptoms test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.panic],
  },
  socialAnxiety: {
    id: CONSUMER_ASSESSMENT_IDS.socialAnxiety,
    label: 'Take social anxiety test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.socialAnxiety],
  },
  loneliness: {
    id: CONSUMER_ASSESSMENT_IDS.loneliness,
    label: 'Take loneliness test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.loneliness],
  },
  selfEsteem: {
    id: CONSUMER_ASSESSMENT_IDS.selfEsteem,
    label: 'Take self-esteem test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.selfEsteem],
  },
  anger: {
    id: CONSUMER_ASSESSMENT_IDS.anger,
    label: 'Take anger test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.anger],
  },
  grief: {
    id: CONSUMER_ASSESSMENT_IDS.grief,
    label: 'Take grief support test',
    link: [...CONSUMER_ROUTES.links.assessments, CONSUMER_ASSESSMENT_IDS.grief],
  },
};

export function consumerAssessmentLink(id: ConsumerAssessmentId): string[] {
  return [...CONSUMER_ROUTES.links.assessments, id];
}
