import type { TelegramBotKind } from '@prisma/client';
import { botKindBySlug, botSlugByKind } from './telegram-bots.config.js';
import type { TelegramBotSlug } from './telegram-bots.types.js';
import { adminUrl, doctorUrl, webUrl } from './telegram-bots.ui.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import type { InlineButton } from './telegram-bots.types.js';
import { whatsappJoinButton } from './telegram-bots.payments.js';

type MenuSession = {
  linkedUser?: { name: string } | null;
};

export function telegramBotKindFromSlug(slug: string): TelegramBotKind | null {
  return (botKindBySlug as Record<string, TelegramBotKind | undefined>)[slug] ?? null;
}

export async function menuFor(kind: TelegramBotKind, linked: boolean): Promise<InlineButton[][]> {
  if (kind === 'USER') {
    const whatsappButton = await whatsappJoinButton();
    return [
      [
        { text: 'Daily plan', callback_data: 'user:plan' },
        { text: 'Take assessment', callback_data: 'user:assessments' }
      ],
      [
        { text: 'My assessment results', callback_data: 'user:results' },
        { text: 'My requests', callback_data: 'user:requests' }
      ],
      [
        { text: 'Add task', callback_data: 'user:addtask' },
        { text: 'Review day', callback_data: 'user:review' }
      ],
      [
        { text: 'Book session', callback_data: 'user:book' },
        { text: 'Get support', callback_data: 'user:support' }
      ],
      [{ text: 'Volunteer support', callback_data: 'user:volunteer' }, whatsappButton],
      [{ text: 'Payments / Donate', callback_data: 'user:payments' }],
      [
        linked
          ? { text: 'My account', callback_data: 'common:me' }
          : { text: 'Link account', callback_data: 'common:link' },
        linked
          ? { text: 'Open profile', url: webUrl('/profile') }
          : { text: 'Create account', callback_data: 'common:signup' }
      ],
      [
        { text: 'Settings', callback_data: 'common:settings' },
        { text: 'Onboarding checklist', callback_data: 'common:onboarding' }
      ],
      [{ text: 'Open website', url: webUrl('/') }]
    ];
  }

  if (kind === 'DOCTOR') {
    return [
      [{ text: 'Join as provider', callback_data: 'doctor:signup' }],
      [{ text: 'Assigned support leads', callback_data: 'doctor:assignments' }],
      [
        { text: 'My queue', callback_data: 'doctor:queue' },
        { text: 'Go online', callback_data: 'doctor:online' }
      ],
      [
        { text: 'Go offline', callback_data: 'doctor:offline' },
        linked
          ? { text: 'My account', callback_data: 'common:me' }
          : { text: 'Link account', callback_data: 'common:link' }
      ],
      [{ text: 'Open doctor app', url: doctorUrl('/') }]
    ];
  }

  return [
    [
      { text: 'Ops summary', callback_data: 'admin:summary' },
      { text: 'New leads', callback_data: 'admin:leads' }
    ],
    [
      { text: 'Contributors', callback_data: 'admin:contributors' },
      linked
        ? { text: 'My account', callback_data: 'common:me' }
        : { text: 'Link account', callback_data: 'common:link' }
    ],
    [{ text: 'Open admin', url: adminUrl('/') }]
  ];
}

export function helpText(kind: TelegramBotKind) {
  if (kind === 'USER') {
    return [
      '<b>Care bot commands</b>',
      '/signup - create a new Hope Hub user account',
      '/link email@example.com - link your account',
      '/settings - account, privacy, and reminder settings',
      '/onboarding - show first steps checklist',
      '/plan - show today plan',
      '/assessments - take an assessment test',
      '/results - latest assessment results',
      '/requests - support, booking, and volunteer request status',
      '/addtask - add a task',
      '/review - save end-of-day review',
      '/book - request a session',
      '/support - support options',
      '/whatsapp - join WhatsApp group',
      '/payments - payment, retry, and donation links',
      '/volunteer - request volunteer support',
      'WhatsApp group: use Join WhatsApp button in menu',
      '',
      'This bot is not an emergency service.'
    ].join('\n');
  }
  if (kind === 'DOCTOR') {
    return [
      '<b>Doctor bot commands</b>',
      '/link doctor@example.com - link doctor account',
      '/assignments - assigned support leads',
      '/queue - real queue summary',
      '/online - mark online',
      '/offline - mark offline'
    ].join('\n');
  }
  return [
    '<b>Ops bot commands</b>',
    '/link admin@example.com - link admin account',
    '/summary - ops summary',
    '/leads - new leads',
    '/contributors - contributor applications'
  ].join('\n');
}

export function startGuideText(kind: TelegramBotKind, session: MenuSession) {
  const linkedLine = session.linkedUser
    ? `Linked as ${escapeHtml(session.linkedUser.name)}.`
    : 'Not linked yet. Send /signup to create an account, or /link your-email@example.com if you already have one.';

  if (kind === 'USER') {
    return [
      '<b>Hope Hub Care Bot</b>',
      linkedLine,
      '',
      '<b>Purpose</b>',
      'This bot helps you manage daily wellness tasks, request sessions, and ask for volunteer support from Telegram.',
      '',
      '<b>What you can do</b>',
      '• Create and review your daily plan',
      '• Add and tick daily tasks',
      '• Request booking follow-up',
      '• Get support for assessments, booking, payments, or safety concerns',
      '• Join WhatsApp community/support group',
      '• Request volunteer support',
      '• Open secure payment, retry payment, or donate',
      '',
      '<b>Safety guideline</b>',
      'This bot is not an emergency service and does not replace a doctor, psychologist, or crisis helpline. If there is immediate danger, contact local emergency services now.',
      '',
      '<b>Privacy guideline</b>',
      'Avoid sharing highly sensitive personal details in Telegram. For private records, use the Hope Hub app/profile.',
      '',
      `<b>Website</b>\n${webUrl('/')}`,
      '',
      'Start with /signup, /link, /plan, /support, /book, /payments, or /help.'
    ].join('\n');
  }

  if (kind === 'DOCTOR') {
    return [
      '<b>Hope Hub Provider Bot</b>',
      linkedLine,
      '',
      '<b>Purpose</b>',
      'This bot helps providers see their queue and manage live availability.',
      '',
      '<b>Guideline</b>',
      'Keep clinical notes and sensitive records inside the doctor portal. Telegram is only for lightweight workflow updates.',
      '',
      `<b>Doctor app</b>\n${doctorUrl('/')}`,
      '',
      'Start with /link, /queue, /online, or /help.'
    ].join('\n');
  }

  return [
    '<b>Hope Hub Ops Bot</b>',
    linkedLine,
    '',
    '<b>Purpose</b>',
    'This bot helps admins see lead, contributor, and operations summaries.',
    '',
    '<b>Guideline</b>',
    'Do not share private user documents in Telegram. Use the admin portal for sensitive details.',
    '',
    `<b>Admin portal</b>\n${adminUrl('/')}`,
    '',
    'Start with /link, /summary, /leads, /contributors, or /help.'
  ].join('\n');
}
