import { CONSUMER_CONCERN_FLOWS } from './consumer-concerns.constants';
import { CONSUMER_SUPPORT_PATHS } from './support-paths.constants';

export type ConsumerFormOption = {
  value: string;
  label: string;
};

export type ConsumerLiveConnectMode = 'chat' | 'voice' | 'video';
export type ConsumerConnectMode = ConsumerLiveConnectMode | 'book';

export type ConsumerLiveConnectModeOption = {
  value: ConsumerLiveConnectMode;
  label: string;
  icon: string;
  copy: string;
};

export const CONSUMER_URGENCY_OPTIONS: ConsumerFormOption[] = [
  { value: 'low', label: 'Low - I can wait a few days' },
  { value: 'normal', label: 'Normal - Please respond within 24 hours' },
  { value: 'high', label: 'High - I need support soon' },
];

export const CONSUMER_CONCERN_CATEGORY_OPTIONS: ConsumerFormOption[] = [
  { value: '', label: 'Select concern category' },
  ...Object.values(CONSUMER_CONCERN_FLOWS).map((flow) => ({
    value: flow.label,
    label: flow.shortLabel || flow.label,
  })),
  { value: 'Family concerns', label: 'Family concerns' },
  { value: 'Child or teen support', label: 'Child or teen support' },
  { value: 'Career or life guidance', label: 'Career or life guidance' },
  { value: 'Other', label: 'Other' },
];

export const CONSUMER_CARE_TEAM_CONCERN_FILTER_OPTIONS: ConsumerFormOption[] = [
  { value: '', label: 'All concerns' },
  ...Object.values(CONSUMER_CONCERN_FLOWS).map((flow) => ({
    value: flow.label,
    label: flow.shortLabel || flow.label,
  })),
  { value: 'Family concerns', label: 'Family concerns' },
];

export const CONSUMER_QUICK_NEED_OPTIONS: ConsumerFormOption[] = [
  { value: '', label: 'Any need' },
  { value: 'anxiety overthinking panic', label: 'Anxiety / overthinking' },
  { value: 'low mood depression sadness', label: 'Low mood / depression' },
  { value: 'stress burnout pressure', label: 'Stress / burnout' },
  { value: 'relationship trust communication', label: 'Relationship concerns' },
  { value: 'breakup heartbreak closure', label: 'Breakup / heartbreak' },
  { value: 'sleep insomnia night overthinking', label: 'Sleep trouble' },
  { value: 'career study exam focus', label: 'Career / study stress' },
];

export const CONSUMER_EXPERT_TYPE_OPTIONS: ConsumerFormOption[] = [
  { value: '', label: 'No preference' },
  ...CONSUMER_SUPPORT_PATHS.map((path) => ({
    value: path.value,
    label: `${path.label} - ${path.title}`,
  })),
];

export const CONSUMER_SESSION_MODE_OPTIONS: ConsumerFormOption[] = [
  { value: 'live_chat', label: 'Live chat' },
  { value: 'online_audio', label: 'Online audio' },
  { value: 'online_video', label: 'Online video' },
  { value: 'chat_followup', label: 'Chat follow-up' },
];

export const CONSUMER_LIVE_CONNECT_MODE_OPTIONS: ConsumerLiveConnectModeOption[] = [
  { value: 'chat', label: 'Chat', icon: '💬', copy: 'Private text support' },
  { value: 'voice', label: 'Voice', icon: '🎧', copy: 'Talk without camera' },
  { value: 'video', label: 'Video', icon: '🎥', copy: 'Face-to-face support' },
];

export const CONSUMER_CONNECT_MODE_META: Record<
  ConsumerConnectMode,
  { label: string; summaryLabel: string; icon: string; description: string }
> = {
  chat: {
    label: 'Chat',
    summaryLabel: 'private chat',
    icon: '💬',
    description: 'Private text support',
  },
  voice: {
    label: 'Voice',
    summaryLabel: 'voice call',
    icon: '🎧',
    description: 'Speak without camera',
  },
  video: {
    label: 'Video',
    summaryLabel: 'video call',
    icon: '🎥',
    description: 'Face-to-face support',
  },
  book: {
    label: 'Book slot',
    summaryLabel: 'booked session',
    icon: '📅',
    description: 'Choose a time',
  },
};

export function consumerLiveMode(mode: ConsumerConnectMode): ConsumerLiveConnectMode {
  return mode === 'book' ? 'voice' : mode;
}

export function consumerSessionModeFor(mode: ConsumerConnectMode): string {
  const liveMode = consumerLiveMode(mode);
  if (liveMode === 'video') return 'online_video';
  if (liveMode === 'chat') return 'live_chat';
  return 'online_audio';
}

export function consumerModeLabel(mode: ConsumerConnectMode): string {
  return CONSUMER_CONNECT_MODE_META[mode].label;
}

export function consumerModeSummaryLabel(mode: ConsumerConnectMode): string {
  return CONSUMER_CONNECT_MODE_META[consumerLiveMode(mode)].summaryLabel;
}

export function consumerModeMatchesText(mode: ConsumerLiveConnectMode, text: string): boolean {
  const normalized = text.toLowerCase();
  if (mode === 'chat') return /\b(chat|message|text)\b/.test(normalized);
  if (mode === 'video') return /\bvideo\b/.test(normalized);
  return /\b(voice|audio|call)\b/.test(normalized);
}

export const CONSUMER_LANGUAGE_OPTIONS: ConsumerFormOption[] = [
  { value: '', label: 'No preference' },
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'Tamil', label: 'Tamil' },
  { value: 'Telugu', label: 'Telugu' },
];

export const CONSUMER_LANGUAGE_FILTER_OPTIONS: ConsumerFormOption[] = [
  { value: '', label: 'Any language' },
  ...CONSUMER_LANGUAGE_OPTIONS.filter((option) => option.value),
];

export const CONSUMER_PROVIDER_GENDER_OPTIONS: ConsumerFormOption[] = [
  { value: '', label: 'No preference' },
  { value: 'FEMALE', label: 'Female provider' },
  { value: 'MALE', label: 'Male provider' },
  { value: 'OTHER', label: 'Other' },
];

export const CONSUMER_SAFETY_RISK_OPTIONS: ConsumerFormOption[] = [
  { value: 'none', label: 'No immediate safety risk' },
  { value: 'unsure', label: 'Not sure / prefer to discuss' },
  { value: 'urgent', label: 'Urgent safety concern' },
];

export const CONSUMER_MODALITY_FILTER_OPTIONS: ConsumerFormOption[] = [
  { value: '', label: 'Any method' },
  { value: 'CBT', label: 'CBT' },
  { value: 'Supportive counselling', label: 'Supportive counselling' },
  { value: 'Mindfulness', label: 'Mindfulness' },
  { value: 'Family counselling', label: 'Family counselling' },
];

export const CONSUMER_SESSION_TYPE_FILTER_OPTIONS: ConsumerFormOption[] = [
  { value: '', label: 'Any session' },
  { value: 'Individual session', label: 'Individual session' },
  { value: 'Relationship support', label: 'Relationship support' },
  { value: 'Family support', label: 'Family support' },
];

export const CONSUMER_AGE_GROUP_FILTER_OPTIONS: ConsumerFormOption[] = [
  { value: '', label: 'Any age group' },
  { value: 'Children', label: 'Gen Alpha / kids' },
  { value: 'Teens', label: 'Gen Z / teens' },
  { value: 'Adults', label: 'Millennials & adults' },
  { value: 'Older adults', label: 'Older adults / seniors' },
];
