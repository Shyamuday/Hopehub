import { Role, TelegramBotKind } from '@prisma/client';
import type { TelegramBotSlug } from './telegram-bots.types.js';

export const botKindBySlug: Record<TelegramBotSlug, TelegramBotKind> = {
  user: TelegramBotKind.USER,
  doctor: TelegramBotKind.DOCTOR,
  admin: TelegramBotKind.ADMIN
};

export const botSlugByKind: Record<TelegramBotKind, TelegramBotSlug> = {
  [TelegramBotKind.USER]: 'user',
  [TelegramBotKind.DOCTOR]: 'doctor',
  [TelegramBotKind.ADMIN]: 'admin'
};

export const botTokenEnvByKind: Record<TelegramBotKind, string> = {
  [TelegramBotKind.USER]: 'TELEGRAM_USER_BOT_TOKEN',
  [TelegramBotKind.DOCTOR]: 'TELEGRAM_DOCTOR_BOT_TOKEN',
  [TelegramBotKind.ADMIN]: 'TELEGRAM_ADMIN_BOT_TOKEN'
};

export const roleByKind: Record<TelegramBotKind, Role> = {
  [TelegramBotKind.USER]: Role.PATIENT,
  [TelegramBotKind.DOCTOR]: Role.DOCTOR,
  [TelegramBotKind.ADMIN]: Role.ADMIN
};

export const botNameByKind: Record<TelegramBotKind, string> = {
  [TelegramBotKind.USER]: 'Hope Hub Web Bot',
  [TelegramBotKind.DOCTOR]: 'Hope Hub Doctor Bot',
  [TelegramBotKind.ADMIN]: 'Hope Hub Ops Bot'
};

export const commandMenus: Record<TelegramBotKind, { command: string; description: string }[]> = {
  [TelegramBotKind.USER]: [
    { command: 'start', description: 'Open care menu' },
    { command: 'signup', description: 'Create user account' },
    { command: 'link', description: 'Link Hope Hub account' },
    { command: 'settings', description: 'Account and reminder settings' },
    { command: 'onboarding', description: 'First steps checklist' },
    { command: 'plan', description: 'Daily plan and review' },
    { command: 'assessments', description: 'Take an assessment test' },
    { command: 'results', description: 'Show latest assessment results' },
    { command: 'requests', description: 'Show support request status' },
    { command: 'addtask', description: 'Add a daily task' },
    { command: 'review', description: 'Save daily review' },
    { command: 'book', description: 'Request a session' },
    { command: 'support', description: 'Get support options' },
    { command: 'whatsapp', description: 'Join WhatsApp group' },
    { command: 'payments', description: 'Payment and donation links' },
    { command: 'volunteer', description: 'Request volunteer support' },
    { command: 'me', description: 'Show linked account' },
    { command: 'help', description: 'Get help' }
  ],
  [TelegramBotKind.DOCTOR]: [
    { command: 'start', description: 'Open doctor menu' },
    { command: 'signup', description: 'Apply for care team/volunteer' },
    { command: 'link', description: 'Link doctor account' },
    { command: 'services', description: 'Manage services and pricing' },
    { command: 'availability', description: 'Manage weekly availability' },
    { command: 'assignments', description: 'Assigned support leads' },
    { command: 'queue', description: 'Show consultation queue' },
    { command: 'outcomes', description: 'Close session with outcome' },
    { command: 'online', description: 'Go online' },
    { command: 'offline', description: 'Go offline' },
    { command: 'me', description: 'Show linked account' },
    { command: 'help', description: 'Doctor bot help' }
  ],
  [TelegramBotKind.ADMIN]: [
    { command: 'start', description: 'Open ops menu' },
    { command: 'link', description: 'Link admin account' },
    { command: 'summary', description: 'Ops summary' },
    { command: 'quality', description: 'Session quality summary' },
    { command: 'leads', description: 'New leads' },
    { command: 'contributors', description: 'Contributor applications' },
    { command: 'me', description: 'Show linked account' },
    { command: 'help', description: 'Ops bot help' }
  ]
};

export const planTaskPresets = [
  { key: 'grounding', title: 'One grounding practice' },
  { key: 'water', title: 'Drink water' },
  { key: 'walk', title: 'Walk 10 minutes' },
  { key: 'journal', title: 'Journal 5 minutes' },
  { key: 'connect', title: 'Message or call someone' },
  { key: 'medicine', title: 'Take medicine / remedy' }
] as const;

export const reviewPresets = [
  { key: 'great', note: 'Great day. I completed meaningful steps.' },
  { key: 'okay', note: 'Okay day. I did what I could.' },
  { key: 'hard', note: 'Hard day. I need gentleness and support.' },
  { key: 'anxious', note: 'Felt anxious today.' },
  { key: 'low', note: 'Felt low today.' },
  { key: 'support', note: 'I want support from the Hope Hub team.' }
] as const;

export const bookingConcernOptions = [
  { key: 'anxiety', label: 'Anxiety & Panic Support' },
  { key: 'low_mood', label: 'Depression & Low Mood Support' },
  { key: 'relationship', label: 'Relationship Guidance' },
  { key: 'breakup', label: 'Breakup & Heartbreak Support' },
  { key: 'career', label: 'Career & Study Pressure' },
  { key: 'sleep', label: 'Sleep & Overthinking Support' }
] as const;

export const volunteerConcernOptions = [
  { key: 'talk', label: 'Talk to volunteer' },
  { key: 'become', label: 'Become volunteer' },
  { key: 'student', label: 'Psychology student' },
  { key: 'life_exp', label: 'Life experience' },
  { key: 'paid_free', label: 'Paid/free details' },
  { key: 'team', label: 'Talk to team' }
] as const;

export const supportConcernOptions = [
  { key: 'emotional', label: 'Emotional support' },
  { key: 'assessment', label: 'Assessment help' },
  { key: 'booking', label: 'Booking help' },
  { key: 'payment', label: 'Payment issue' },
  { key: 'volunteer', label: 'Volunteer help' },
  { key: 'safety', label: 'Safety concern' }
] as const;

export const supportChannelOptions = [
  { key: 'chat', label: 'Chat follow-up' },
  { key: 'voice', label: 'Voice call' },
  { key: 'video', label: 'Video session' },
  { key: 'psychologist', label: 'Psychologist session' }
] as const;

export const callbackTimeOptions = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'evening', label: 'Evening' },
  { key: 'weekend', label: 'Weekend' }
] as const;
