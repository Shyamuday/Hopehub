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
  label: string;
  shortLabel: string;
  searchTerms: string[];
  assessmentId: ConsumerAssessmentRouteMatch['id'];
  assessmentLabel: string;
  supportPath: ConsumerSupportPath;
  assessment: ConsumerAssessmentRouteMatch;
  careTeamQueryParams: Record<string, string>;
  bookingQueryParams: Record<string, string>;
  careTeamLink: string[];
  bookingLink: string[];
};

function concernFlow(params: {
  key: ConsumerConcernKey;
  label: string;
  shortLabel?: string;
  searchTerms: string[];
  assessment: ConsumerAssessmentRouteMatch;
  supportPath?: ConsumerSupportPath;
}): ConsumerConcernFlow {
  const concern = params.label;
  const supportPath = params.supportPath || 'PROFESSIONAL_CARE';
  return {
    key: params.key,
    label: concern,
    shortLabel: params.shortLabel || concern,
    searchTerms: params.searchTerms,
    assessmentId: params.assessment.id,
    assessmentLabel: params.assessment.label,
    supportPath,
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
    careTeamLink: CONSUMER_ROUTES.links.careTeam,
    bookingLink: CONSUMER_ROUTES.links.bookSupport,
  };
}

export const CONSUMER_CONCERN_FLOWS: Record<ConsumerConcernKey, ConsumerConcernFlow> = {
  anxiety: concernFlow({
    key: 'anxiety',
    label: 'Anxiety',
    searchTerms: ['anxiety', 'worry', 'overthinking', 'fear', 'nervous'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.anxiety,
  }),
  depression: concernFlow({
    key: 'depression',
    label: 'Low mood',
    shortLabel: 'Depression',
    searchTerms: ['depression', 'depressed', 'low mood', 'sad', 'hopeless', 'empty', 'mood'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.depression,
  }),
  stress: concernFlow({
    key: 'stress',
    label: 'Stress',
    searchTerms: ['stress', 'pressure', 'tension', 'overwhelm'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.stress,
  }),
  breakup: concernFlow({
    key: 'breakup',
    label: 'Breakup recovery',
    searchTerms: ['breakup', 'heartbreak', 'no contact', 'closure'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.breakup,
    supportPath: 'EMOTIONAL_LISTENER',
  }),
  sleep: concernFlow({
    key: 'sleep',
    label: 'Sleep concerns',
    shortLabel: 'Sleep',
    searchTerms: ['sleep', 'insomnia', 'night', 'rest'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.sleep,
  }),
  relationship: concernFlow({
    key: 'relationship',
    label: 'Relationship concerns',
    shortLabel: 'Relationship',
    searchTerms: ['relationship', 'couple', 'partner', 'marriage', 'trust', 'communication'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.relationship,
  }),
  burnout: concernFlow({
    key: 'burnout',
    label: 'Burnout',
    searchTerms: ['burnout', 'work stress', 'exhausted', 'professional stress'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.burnout,
  }),
  panic: concernFlow({
    key: 'panic',
    label: 'Panic symptoms',
    shortLabel: 'Panic',
    searchTerms: ['panic', 'panic attack', 'palpitation', 'heart racing'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.panic,
  }),
  socialAnxiety: concernFlow({
    key: 'socialAnxiety',
    label: 'Social anxiety',
    searchTerms: ['social anxiety', 'fear of judgement', 'public speaking', 'shy', 'social fear'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.socialAnxiety,
  }),
  loneliness: concernFlow({
    key: 'loneliness',
    label: 'Loneliness',
    searchTerms: ['lonely', 'loneliness', 'isolated', 'connection'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.loneliness,
    supportPath: 'EMOTIONAL_LISTENER',
  }),
  selfEsteem: concernFlow({
    key: 'selfEsteem',
    label: 'Self-esteem',
    searchTerms: ['self esteem', 'self-worth', 'confidence', 'worthless'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.selfEsteem,
    supportPath: 'COACH_MENTOR',
  }),
  anger: concernFlow({
    key: 'anger',
    label: 'Anger regulation',
    shortLabel: 'Anger',
    searchTerms: ['anger', 'irritated', 'irritation', 'rage', 'temper'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.anger,
  }),
  grief: concernFlow({
    key: 'grief',
    label: 'Grief support',
    shortLabel: 'Grief',
    searchTerms: ['grief', 'loss', 'bereavement'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.grief,
    supportPath: 'EMOTIONAL_LISTENER',
  }),
  wellbeing: concernFlow({
    key: 'wellbeing',
    label: 'Wellbeing',
    searchTerms: ['wellbeing', 'well-being', 'wellness', 'happiness'],
    assessment: CONSUMER_ASSESSMENT_ROUTES.wellbeing,
    supportPath: 'COACH_MENTOR',
  }),
  general: concernFlow({
    key: 'general',
    label: 'Mental health',
    shortLabel: 'General',
    searchTerms: ['mental health', 'support', 'counselling', 'therapy'],
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
