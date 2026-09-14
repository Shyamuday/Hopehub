import type { GroupHelpFilter } from '../services/telegram-group-help.filters.js';

const ASSET_ROOT =
  'https://hopehub-public-assets-924479393196.s3.us-east-1.amazonaws.com/telegram/wellbeing';

/**
 * Carefully scoped defaults for support-seeking language. These use phrases,
 * rather than broad words such as "depression", to avoid interrupting normal
 * mental-health conversations in the community.
 */
export const GROUP_HELP_WELLBEING_FILTERS: GroupHelpFilter[] = [
  {
    id: 'hopehub-immediate-support-v1',
    category: 'crisis',
    notifyStaff: true,
    triggers: [
      'suicide',
      'sucide',
      'suicde',
      'suicidal',
      'self harm',
      'self-harm',
      'kill myself',
      'end my life',
      "don't want to live",
      'dont want to live',
      'do not want to live',
      'want to die',
      'ending my life',
      'jeena nahi',
      'marna chahta',
      'marna chahti',
      'khud ko mar',
      'zindagi khatam'
    ].map((value) => ({ value, mode: 'contains' as const })),
    text: '{mention}, I’m really sorry you’re carrying this. If you may act now or are in immediate danger, call India’s emergency number *112* or go to the nearest emergency department. For 24/7 tele-mental-health support, call *Tele-MANAS at 14416* (or 1800-89-14416). If possible, stay with someone you trust and move away from anything you could use to hurt yourself. Hope Hub is not an emergency service.',
    media: {
      type: 'photo',
      fileId: `${ASSET_ROOT}/hopehub-immediate-support-v1.png`
    },
    button: {
      text: 'Open Hope Hub support',
      url: 'https://hopehub.in/#live-connect'
    },
    audience: 'all',
    allowBots: false
  },
  {
    id: 'hopehub-anxiety-support-v1',
    category: 'wellbeing',
    cooldownSeconds: 30 * 60,
    triggers: [
      'panic attack',
      'anxiety attack',
      'severe anxiety',
      'panic ho raha',
      'panic ho rahi',
      'ghabrahat ho raha',
      'ghabrahat ho rahi',
      "can't breathe from anxiety",
      'cant breathe from anxiety',
      'cannot breathe from anxiety'
    ].map((value) => ({ value, mode: 'contains' as const })),
    text: '{mention}, pause with us for a moment. If it feels comfortable, breathe in gently for 4, hold for 4, and breathe out slowly for 6. Stop if this feels uncomfortable. You can ask for support below. If you have severe physical symptoms or are in immediate danger, contact emergency services.',
    media: {
      type: 'photo',
      fileId: `${ASSET_ROOT}/hopehub-anxiety-support-v1.png`
    },
    button: {
      text: 'Ask for support',
      url: 'https://hopehub.in/#live-connect'
    },
    audience: 'all',
    allowBots: false
  },
  {
    id: 'hopehub-low-mood-support-v1',
    category: 'wellbeing',
    cooldownSeconds: 30 * 60,
    triggers: [
      'feeling depressed',
      'feel depressed',
      'feeling hopeless',
      'feel hopeless',
      "can't cope",
      'cant cope',
      'cannot cope',
      'no hope left',
      'bahut udaas',
      'koi umeed nahi'
    ].map((value) => ({ value, mode: 'contains' as const })),
    text: '{mention}, thank you for saying this. You don’t have to solve everything right now. Consider staying near someone you trust and taking one small next step. You can request support below. If you may harm yourself, call 112 or Tele-MANAS at 14416 now.',
    media: {
      type: 'photo',
      fileId: `${ASSET_ROOT}/hopehub-low-mood-support-v1.png`
    },
    button: {
      text: 'Ask for support',
      url: 'https://hopehub.in/#live-connect'
    },
    audience: 'all',
    allowBots: false
  },
  {
    id: 'hopehub-loneliness-support-v1',
    category: 'wellbeing',
    cooldownSeconds: 30 * 60,
    triggers: [
      'feeling lonely',
      'i am lonely',
      "i'm lonely",
      'im lonely',
      'no one to talk to',
      'need someone to talk to',
      'feel alone',
      'akela feel',
      'akeli feel',
      'koi baat karne wala nahi'
    ].map((value) => ({ value, mode: 'contains' as const })),
    text: '{mention}, you’re welcome here. You can join the conversation at your own pace or request one-to-one support below. Please keep personal contact details private and use Hope Hub’s safe channels.',
    media: {
      type: 'photo',
      fileId: `${ASSET_ROOT}/hopehub-loneliness-support-v1.png`
    },
    button: {
      text: 'Connect safely',
      url: 'https://hopehub.in/#live-connect'
    },
    audience: 'all',
    allowBots: false
  }
];

export const GROUP_HELP_WELLBEING_FILTER_DEFINITIONS = GROUP_HELP_WELLBEING_FILTERS.map(
  (filter) => `rose-filter:${JSON.stringify(filter)}`
).join('\n');

/**
 * Crisis and wellbeing defaults must survive older per-group overrides. Keep an
 * existing definition when it has the same stable ID so admins can edit its copy.
 */
export function withGroupHelpWellbeingFilterDefaults(definitions: string) {
  const current = definitions.trim();
  const missing = GROUP_HELP_WELLBEING_FILTERS.filter((filter) => {
    if (!filter.id) return false;
    const escapedId = filter.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`"id"\\s*:\\s*"${escapedId}"`, 'i').test(current);
  }).map((filter) => `rose-filter:${JSON.stringify(filter)}`);
  return [current, ...missing].filter(Boolean).join('\n');
}
