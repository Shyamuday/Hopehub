export type ConsumerSupportPath = 'PROFESSIONAL_CARE' | 'COACH_MENTOR' | 'EMOTIONAL_LISTENER';

export type ConsumerConcernFlowDefinition = {
  key: string;
  label: string;
  shortLabel: string;
  searchTerms: string[];
  serviceSearchTerms: string[];
  assessmentId: string;
  assessmentLabel: string;
  supportPath: ConsumerSupportPath;
};

export const CONSUMER_CONCERN_FLOW_DEFINITIONS: ConsumerConcernFlowDefinition[] = [
  {
    key: 'anxiety',
    label: 'Anxiety',
    shortLabel: 'Anxiety',
    searchTerms: ['anxiety', 'worry', 'overthinking', 'fear', 'nervous'],
    serviceSearchTerms: ['anxiety', 'worry', 'overthinking', 'panic', 'calm'],
    assessmentId: 'gad7',
    assessmentLabel: 'Take anxiety test',
    supportPath: 'PROFESSIONAL_CARE'
  },
  {
    key: 'depression',
    label: 'Low mood',
    shortLabel: 'Depression',
    searchTerms: ['depression', 'depressed', 'low mood', 'sad', 'hopeless', 'empty', 'mood'],
    serviceSearchTerms: ['depression', 'low mood', 'sad', 'mood', 'emotional support'],
    assessmentId: 'phq9',
    assessmentLabel: 'Take depression test',
    supportPath: 'PROFESSIONAL_CARE'
  },
  {
    key: 'stress',
    label: 'Stress',
    shortLabel: 'Stress',
    searchTerms: ['stress', 'pressure', 'tension', 'overwhelm'],
    serviceSearchTerms: ['stress', 'pressure', 'overwhelm', 'burnout', 'work stress'],
    assessmentId: 'pss10',
    assessmentLabel: 'Take stress test',
    supportPath: 'PROFESSIONAL_CARE'
  },
  {
    key: 'breakup',
    label: 'Breakup recovery',
    shortLabel: 'Breakup',
    searchTerms: ['breakup', 'heartbreak', 'no contact', 'closure'],
    serviceSearchTerms: ['breakup', 'heartbreak', 'relationship ending', 'closure'],
    assessmentId: 'breakup-recovery',
    assessmentLabel: 'Take breakup recovery test',
    supportPath: 'EMOTIONAL_LISTENER'
  },
  {
    key: 'sleep',
    label: 'Sleep concerns',
    shortLabel: 'Sleep',
    searchTerms: ['sleep', 'insomnia', 'night', 'rest'],
    serviceSearchTerms: ['sleep', 'insomnia', 'overthinking', 'night', 'rest'],
    assessmentId: 'sleep',
    assessmentLabel: 'Take sleep test',
    supportPath: 'PROFESSIONAL_CARE'
  },
  {
    key: 'relationship',
    label: 'Relationship concerns',
    shortLabel: 'Relationship',
    searchTerms: ['relationship', 'couple', 'partner', 'marriage', 'trust', 'communication'],
    serviceSearchTerms: ['relationship', 'couple', 'partner', 'marriage', 'trust', 'communication'],
    assessmentId: 'relationship',
    assessmentLabel: 'Take relationship test',
    supportPath: 'PROFESSIONAL_CARE'
  },
  {
    key: 'burnout',
    label: 'Burnout',
    shortLabel: 'Burnout',
    searchTerms: ['burnout', 'work stress', 'exhausted', 'professional stress'],
    serviceSearchTerms: ['burnout', 'work stress', 'exhausted', 'professional stress', 'career'],
    assessmentId: 'burnout',
    assessmentLabel: 'Take burnout test',
    supportPath: 'PROFESSIONAL_CARE'
  },
  {
    key: 'panic',
    label: 'Panic symptoms',
    shortLabel: 'Panic',
    searchTerms: ['panic', 'panic attack', 'palpitation', 'heart racing'],
    serviceSearchTerms: ['panic', 'panic attack', 'anxiety', 'heart racing'],
    assessmentId: 'panic-symptoms',
    assessmentLabel: 'Take panic symptoms test',
    supportPath: 'PROFESSIONAL_CARE'
  },
  {
    key: 'socialAnxiety',
    label: 'Social anxiety',
    shortLabel: 'Social anxiety',
    searchTerms: ['social anxiety', 'fear of judgement', 'public speaking', 'shy', 'social fear'],
    serviceSearchTerms: ['social anxiety', 'confidence', 'public speaking', 'fear of judgement'],
    assessmentId: 'social-anxiety',
    assessmentLabel: 'Take social anxiety test',
    supportPath: 'PROFESSIONAL_CARE'
  },
  {
    key: 'loneliness',
    label: 'Loneliness',
    shortLabel: 'Loneliness',
    searchTerms: ['lonely', 'loneliness', 'isolated', 'connection'],
    serviceSearchTerms: ['lonely', 'loneliness', 'connection', 'emotional support'],
    assessmentId: 'loneliness',
    assessmentLabel: 'Take loneliness test',
    supportPath: 'EMOTIONAL_LISTENER'
  },
  {
    key: 'selfEsteem',
    label: 'Self-esteem',
    shortLabel: 'Self-esteem',
    searchTerms: ['self esteem', 'self-worth', 'confidence', 'worthless'],
    serviceSearchTerms: ['self esteem', 'self-worth', 'confidence', 'life coach'],
    assessmentId: 'self-esteem',
    assessmentLabel: 'Take self-esteem test',
    supportPath: 'COACH_MENTOR'
  },
  {
    key: 'anger',
    label: 'Anger regulation',
    shortLabel: 'Anger',
    searchTerms: ['anger', 'irritated', 'irritation', 'rage', 'temper'],
    serviceSearchTerms: ['anger', 'irritation', 'rage', 'temper', 'emotional regulation'],
    assessmentId: 'anger-regulation',
    assessmentLabel: 'Take anger test',
    supportPath: 'PROFESSIONAL_CARE'
  },
  {
    key: 'grief',
    label: 'Grief support',
    shortLabel: 'Grief',
    searchTerms: ['grief', 'loss', 'bereavement'],
    serviceSearchTerms: ['grief', 'loss', 'bereavement', 'emotional support'],
    assessmentId: 'grief-support',
    assessmentLabel: 'Take grief support test',
    supportPath: 'EMOTIONAL_LISTENER'
  },
  {
    key: 'wellbeing',
    label: 'Wellbeing',
    shortLabel: 'Wellbeing',
    searchTerms: ['wellbeing', 'well-being', 'wellness', 'happiness'],
    serviceSearchTerms: ['wellbeing', 'wellness', 'happiness', 'life coach', 'mindfulness'],
    assessmentId: 'who5',
    assessmentLabel: 'Take wellbeing test',
    supportPath: 'COACH_MENTOR'
  },
  {
    key: 'general',
    label: 'Mental health',
    shortLabel: 'General',
    searchTerms: ['mental health', 'support', 'counselling', 'therapy'],
    serviceSearchTerms: ['mental health', 'support', 'counselling', 'therapy'],
    assessmentId: 'dass21',
    assessmentLabel: 'Take mental health test',
    supportPath: 'PROFESSIONAL_CARE'
  }
];
