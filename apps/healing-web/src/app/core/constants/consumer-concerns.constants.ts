import {
  CONSUMER_ASSESSMENT_ROUTES,
  CONSUMER_ROUTES,
  ConsumerAssessmentRouteMatch,
} from './consumer-routes.constants';
import { ConsumerSupportPath } from './support-paths.constants';

export type ConsumerConcernKey =
  | 'anxiety'
  | 'depression'
  | 'stress'
  | 'breakup'
  | 'sleep'
  | 'relationship'
  | 'burnout'
  | 'panic'
  | 'socialAnxiety'
  | 'loneliness'
  | 'selfEsteem'
  | 'anger'
  | 'grief'
  | 'wellbeing'
  | 'general';

export type ConsumerConcernFlow = {
  key: ConsumerConcernKey;
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  searchTerms: string[];
  serviceSearchTerms: string[];
  assessmentId: ConsumerAssessmentRouteMatch['id'];
  assessmentLabel: string;
  supportPath: ConsumerSupportPath;
  isActive: boolean;
  showOnHome: boolean;
  showInResourceHub: boolean;
  showInSupportGuide: boolean;
  sortOrder: number;
  assessment: ConsumerAssessmentRouteMatch;
  careTeamQueryParams: Record<string, string>;
  bookingQueryParams: Record<string, string>;
  serviceQueryParams: Record<string, string>;
  serviceMatches: Array<{ id: string; diseaseId?: string; slug?: string | null; name: string }>;
  servicesLink: readonly string[];
  careTeamLink: readonly string[];
  bookingLink: readonly string[];
};

function concernFlow(params: {
  key: ConsumerConcernKey;
  label: string;
  shortLabel?: string;
  searchTerms: string[];
  serviceSearchTerms?: string[];
  assessment: ConsumerAssessmentRouteMatch;
  supportPath?: ConsumerSupportPath;
  slug?: string;
}): ConsumerConcernFlow {
  const concern = params.label;
  const supportPath = params.supportPath || 'PROFESSIONAL_CARE';
  return {
    key: params.key,
    slug: params.slug || params.key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
    label: concern,
    shortLabel: params.shortLabel || concern,
    description: `Explore self-help and human support for ${concern.toLowerCase()}.`,
    searchTerms: params.searchTerms,
    serviceSearchTerms: params.serviceSearchTerms || params.searchTerms,
    assessmentId: params.assessment.id,
    assessmentLabel: params.assessment.label,
    supportPath,
    isActive: true,
    showOnHome: true,
    showInResourceHub: true,
    showInSupportGuide: true,
    sortOrder: 0,
    assessment: params.assessment,
    careTeamQueryParams: {
      concern,
      roleGroup: supportPath,
    },
    bookingQueryParams: {
      concern,
      supportPath,
      source: 'concern-flow',
    },
    serviceQueryParams: {
      concern,
      q: params.serviceSearchTerms?.[0] || params.searchTerms[0] || concern,
    },
    serviceMatches: [],
    servicesLink: CONSUMER_ROUTES.links.services,
    careTeamLink: CONSUMER_ROUTES.links.careTeam,
    bookingLink: CONSUMER_ROUTES.links.bookSupport,
  };
}

export const CONSUMER_CONCERN_FLOWS: Record<ConsumerConcernKey, ConsumerConcernFlow> = {
  anxiety: concernFlow({
    key: 'anxiety',
    label: 'Anxiety',
    searchTerms: ['anxiety', 'worry', 'overthinking', 'fear', 'nervous'],
    serviceSearchTerms: ['anxiety', 'worry', 'overthinking', 'panic', 'calm'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.anxiety,
  }),
  depression: concernFlow({
    key: 'depression',
    label: 'Low mood',
    shortLabel: 'Depression',
    searchTerms: ['depression', 'depressed', 'low mood', 'sad', 'hopeless', 'empty', 'mood'],
    serviceSearchTerms: ['depression', 'low mood', 'sad', 'mood', 'emotional support'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.depression,
  }),
  stress: concernFlow({
    key: 'stress',
    label: 'Stress',
    searchTerms: ['stress', 'pressure', 'tension', 'overwhelm'],
    serviceSearchTerms: ['stress', 'pressure', 'overwhelm', 'burnout', 'work stress'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.stress,
  }),
  breakup: concernFlow({
    key: 'breakup',
    label: 'Breakup recovery',
    searchTerms: ['breakup', 'heartbreak', 'no contact', 'closure'],
    serviceSearchTerms: ['breakup', 'heartbreak', 'relationship ending', 'closure'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.breakup,
    supportPath: 'EMOTIONAL_LISTENER',
  }),
  sleep: concernFlow({
    key: 'sleep',
    label: 'Sleep concerns',
    shortLabel: 'Sleep',
    searchTerms: ['sleep', 'insomnia', 'night', 'rest'],
    serviceSearchTerms: ['sleep', 'insomnia', 'overthinking', 'night', 'rest'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.sleep,
  }),
  relationship: concernFlow({
    key: 'relationship',
    label: 'Relationship concerns',
    shortLabel: 'Relationship',
    searchTerms: ['relationship', 'couple', 'partner', 'marriage', 'trust', 'communication'],
    serviceSearchTerms: ['relationship', 'couple', 'partner', 'marriage', 'trust', 'communication'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.relationship,
  }),
  burnout: concernFlow({
    key: 'burnout',
    label: 'Burnout',
    searchTerms: ['burnout', 'work stress', 'exhausted', 'professional stress'],
    serviceSearchTerms: ['burnout', 'work stress', 'exhausted', 'professional stress', 'career'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.burnout,
  }),
  panic: concernFlow({
    key: 'panic',
    label: 'Panic symptoms',
    shortLabel: 'Panic',
    searchTerms: ['panic', 'panic attack', 'palpitation', 'heart racing'],
    serviceSearchTerms: ['panic', 'panic attack', 'anxiety', 'heart racing'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.panic,
  }),
  socialAnxiety: concernFlow({
    key: 'socialAnxiety',
    label: 'Social anxiety',
    searchTerms: ['social anxiety', 'fear of judgement', 'public speaking', 'shy', 'social fear'],
    serviceSearchTerms: ['social anxiety', 'confidence', 'public speaking', 'fear of judgement'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.socialAnxiety,
  }),
  loneliness: concernFlow({
    key: 'loneliness',
    label: 'Loneliness',
    searchTerms: ['lonely', 'loneliness', 'isolated', 'connection'],
    serviceSearchTerms: ['lonely', 'loneliness', 'connection', 'emotional support'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.loneliness,
    supportPath: 'EMOTIONAL_LISTENER',
  }),
  selfEsteem: concernFlow({
    key: 'selfEsteem',
    label: 'Self-esteem',
    searchTerms: ['self esteem', 'self-worth', 'confidence', 'worthless'],
    serviceSearchTerms: ['self esteem', 'self-worth', 'confidence', 'life coach'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.selfEsteem,
    supportPath: 'COACH_MENTOR',
  }),
  anger: concernFlow({
    key: 'anger',
    label: 'Anger regulation',
    shortLabel: 'Anger',
    searchTerms: ['anger', 'irritated', 'irritation', 'rage', 'temper'],
    serviceSearchTerms: ['anger', 'irritation', 'rage', 'temper', 'emotional regulation'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.anger,
  }),
  grief: concernFlow({
    key: 'grief',
    label: 'Grief support',
    shortLabel: 'Grief',
    searchTerms: ['grief', 'loss', 'bereavement'],
    serviceSearchTerms: ['grief', 'loss', 'bereavement', 'emotional support'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.grief,
    supportPath: 'EMOTIONAL_LISTENER',
  }),
  wellbeing: concernFlow({
    key: 'wellbeing',
    label: 'Wellbeing',
    searchTerms: ['wellbeing', 'well-being', 'wellness', 'happiness'],
    serviceSearchTerms: ['wellbeing', 'wellness', 'happiness', 'life coach', 'mindfulness'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.wellbeing,
    supportPath: 'COACH_MENTOR',
  }),
  general: concernFlow({
    key: 'general',
    label: 'Mental health',
    shortLabel: 'General',
    searchTerms: ['mental health', 'support', 'counselling', 'therapy'],
    serviceSearchTerms: ['mental health', 'support', 'counselling', 'therapy'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.mentalHealth,
  }),
};

export const CONSUMER_CONCERN_ORDER: ConsumerConcernKey[] = [
  'anxiety',
  'depression',
  'stress',
  'relationship',
  'sleep',
  'breakup',
  'burnout',
  'panic',
  'socialAnxiety',
  'loneliness',
  'selfEsteem',
  'anger',
  'grief',
  'wellbeing',
];

export function consumerConcernForText(value: string): ConsumerConcernFlow {
  const text = value.toLowerCase();
  const concern = CONSUMER_CONCERN_ORDER.find((key) =>
    CONSUMER_CONCERN_FLOWS[key].searchTerms.some((term) => text.includes(term)),
  );
  return CONSUMER_CONCERN_FLOWS[concern || 'general'];
}

export function consumerAssessmentForText(value: string): ConsumerAssessmentRouteMatch {
  return consumerConcernForText(value).assessment;
}

export function consumerCareTeamFlowForText(
  value: string,
): Pick<ConsumerConcernFlow, 'careTeamLink' | 'careTeamQueryParams' | 'label' | 'key'> {
  const concern = consumerConcernForText(value);
  return {
    key: concern.key,
    label: concern.label,
    careTeamLink: concern.careTeamLink,
    careTeamQueryParams: concern.careTeamQueryParams,
  };
}

export function consumerBookingFlowForText(
  value: string,
): Pick<ConsumerConcernFlow, 'bookingLink' | 'bookingQueryParams' | 'label' | 'key'> {
  const concern = consumerConcernForText(value);
  return {
    key: concern.key,
    label: concern.label,
    bookingLink: concern.bookingLink,
    bookingQueryParams: concern.bookingQueryParams,
  };
}
