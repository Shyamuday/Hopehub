import type { TelegramBotKind } from '@prisma/client';
import { botKindBySlug, botNameByKind } from './telegram-bots.config.js';
import type { TelegramBotSlug } from './telegram-bots.types.js';
import { adminUrl, doctorUrl, webUrl } from './telegram-bots.ui.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import type { InlineButton } from './telegram-bots.types.js';
import { whatsappJoinButton } from './telegram-bots.payments.js';
import { getSiteConfigMap } from './site-config.service.js';

type MenuSession = {
  linkedUser?: { name: string } | null;
};

export function telegramBotKindFromSlug(slug: string): TelegramBotKind | null {
  return (botKindBySlug as Record<string, TelegramBotKind | undefined>)[slug] ?? null;
}

export async function menuFor(kind: TelegramBotKind, linked: boolean): Promise<InlineButton[][]> {
  const { telegramUsername } = await getSiteConfigMap(['telegramUsername']);
  const communityUsername = telegramUsername.trim().replace(/^@/, '');
  const communityRow = communityUsername
    ? [[{ text: 'Hope Hub community', url: `https://t.me/${communityUsername}` }]]
    : [];
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
      [{ text: 'Emotional support listener', callback_data: 'user:volunteer' }, whatsappButton],
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
      ...communityRow,
      [{ text: 'Open website', url: webUrl('/') }]
    ];
  }

  if (kind === 'DOCTOR') {
    return [
      [{ text: 'Join care team', callback_data: 'doctor:signup' }],
      [{ text: 'Provider dashboard', callback_data: 'provider:dashboard' }],
      [
        { text: 'My services & pricing', callback_data: 'provider:services' },
        { text: 'My availability', callback_data: 'provider:availability' }
      ],
      [{ text: 'Assigned support leads', callback_data: 'doctor:assignments' }],
      [
        { text: 'My queue', callback_data: 'doctor:queue' },
        { text: 'Go online', callback_data: 'doctor:online' }
      ],
      [
        { text: 'Feedback', callback_data: 'provider:feedback' },
        { text: 'Earnings', callback_data: 'provider:earnings' }
      ],
      [
        { text: 'Share my profile', callback_data: 'provider:share' },
        { text: 'Profile readiness', callback_data: 'provider:readiness' }
      ],
      [{ text: 'Close session / outcome', callback_data: 'doctor:outcomes' }],
      [
        { text: 'Go offline', callback_data: 'doctor:offline' },
        linked
          ? { text: 'My account', callback_data: 'common:me' }
          : { text: 'Link account', callback_data: 'common:link' }
      ],
      ...communityRow,
      [{ text: 'Open provider portal', url: doctorUrl('/') }]
    ];
  }

  return [
    [
      { text: 'Ops summary', callback_data: 'admin:summary' },
      { text: 'Session quality', callback_data: 'admin:quality:30' }
    ],
    [{ text: 'Bot health', callback_data: 'admin:bot_health' }],
    [
      { text: 'New leads', callback_data: 'admin:leads' },
      { text: 'Contributors', callback_data: 'admin:contributors' }
    ],
    [{ text: 'Community admin applications', callback_data: 'admin:community_admins' }],
    [
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
      '/requests - support, booking, and listener request status',
      '/addtask - add a task',
      '/review - save end-of-day review',
      '/book - request a session',
      '/support - support options',
      '/whatsapp - join WhatsApp group',
      '/payments - payment, retry, and donation links',
      '/volunteer - request emotional support listener',
      'WhatsApp group: use Join WhatsApp button in menu',
      '',
      'This bot is not an emergency service.'
    ].join('\n');
  }
  if (kind === 'DOCTOR') {
    return [
      '<b>Care team bot commands</b>',
      '/link provider@example.com - link provider account',
      '/services - manage services and pricing',
      '/availability - manage weekly availability',
      '/dashboard - today’s provider overview',
      '/feedback - anonymous consumer feedback',
      '/earnings - this month’s earnings and payout state',
      '/share - profile, booking, chat, voice, and video links',
      '/readiness - see what must be completed before public bookings',
      '/assignments - assigned support leads',
      '/queue - real queue summary',
      '/outcomes - close a session with outcome',
      '/online - mark online',
      '/offline - mark offline'
    ].join('\n');
  }
  return [
    '<b>Ops bot commands</b>',
    '/link admin@example.com - link admin account',
    '/summary - ops summary',
    '/bothealth - configuration, webhook, pending updates, and Telegram errors',
    '/quality - session quality summary',
    '/leads - new leads',
    '/communityadmins - Hope Hub community admin applications',
    '/contributors - contributor applications'
  ].join('\n');
}

export function startGuideText(kind: TelegramBotKind, session: MenuSession) {
  const linkedLine = session.linkedUser
    ? `Linked as ${escapeHtml(session.linkedUser.name)}.`
    : 'Not linked yet. Send /signup to create an account, or /link your-email@example.com if you already have one.';

  if (kind === 'USER') {
    return [
      `<b>${botNameByKind[kind]}</b>`,
      linkedLine,
      '',
      '<b>Purpose</b>',
      'This bot helps you manage daily wellness tasks, request sessions, and ask for emotional support listeners from Telegram.',
      '',
      '<b>What you can do</b>',
      '• Create and review your daily plan',
      '• Add and tick daily tasks',
      '• Request booking follow-up',
      '• Get support for assessments, booking, payments, or safety concerns',
      '• Join WhatsApp community/support group',
      '• Request emotional support listener',
      '• Open secure payment, retry payment, or donate',
      '',
      '<b>Safety guideline</b>',
      'This bot is not an emergency service and does not replace a licensed clinician, psychologist, or crisis helpline. If there is immediate danger, contact local emergency services now.',
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
      `<b>${botNameByKind[kind]}</b>`,
      linkedLine,
      '',
      '<b>Purpose</b>',
      'This bot helps care team members see their queue and manage live availability.',
      '',
      '<b>Guideline</b>',
      'Keep clinical notes and sensitive records inside the provider portal. Telegram is only for lightweight workflow updates.',
      '',
      `<b>Provider portal</b>\n${doctorUrl('/')}`,
      '',
      'Start with /link, /queue, /online, or /help.'
    ].join('\n');
  }

  return [
    `<b>${botNameByKind[kind]}</b>`,
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
    'Start with /link, /summary, /bothealth, /leads, /communityadmins, /contributors, or /help.'
  ].join('\n');
}
