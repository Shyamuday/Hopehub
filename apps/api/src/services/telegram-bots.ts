import { Prisma, TelegramBotKind } from '@prisma/client';
import { SERVER_CONFIG } from '../constants/config.constants.js';
import { prisma } from '../db.js';

export type TelegramBotSlug = 'user' | 'doctor' | 'admin';

type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number | string;
  type?: string;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type InlineButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

type SendMessagePayload = {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML';
  reply_markup?: {
    inline_keyboard: InlineButton[][];
  };
};

const botKindBySlug: Record<TelegramBotSlug, TelegramBotKind> = {
  user: TelegramBotKind.USER,
  doctor: TelegramBotKind.DOCTOR,
  admin: TelegramBotKind.ADMIN
};

const botSlugByKind: Record<TelegramBotKind, TelegramBotSlug> = {
  [TelegramBotKind.USER]: 'user',
  [TelegramBotKind.DOCTOR]: 'doctor',
  [TelegramBotKind.ADMIN]: 'admin'
};

const botTokenEnvByKind: Record<TelegramBotKind, string> = {
  [TelegramBotKind.USER]: 'TELEGRAM_USER_BOT_TOKEN',
  [TelegramBotKind.DOCTOR]: 'TELEGRAM_DOCTOR_BOT_TOKEN',
  [TelegramBotKind.ADMIN]: 'TELEGRAM_ADMIN_BOT_TOKEN'
};

const botNameByKind: Record<TelegramBotKind, string> = {
  [TelegramBotKind.USER]: 'Hope Hub Care Bot',
  [TelegramBotKind.DOCTOR]: 'Hope Hub Doctor Bot',
  [TelegramBotKind.ADMIN]: 'Hope Hub Ops Bot'
};

const commandMenus: Record<TelegramBotKind, { command: string; description: string }[]> = {
  [TelegramBotKind.USER]: [
    { command: 'start', description: 'Open the care menu' },
    { command: 'plan', description: 'Daily plan and review' },
    { command: 'book', description: 'Book a session' },
    { command: 'help', description: 'Get support options' }
  ],
  [TelegramBotKind.DOCTOR]: [
    { command: 'start', description: 'Open doctor menu' },
    { command: 'queue', description: 'Open consultation queue' },
    { command: 'online', description: 'Open live doctor controls' },
    { command: 'help', description: 'Doctor bot help' }
  ],
  [TelegramBotKind.ADMIN]: [
    { command: 'start', description: 'Open ops menu' },
    { command: 'leads', description: 'Open leads' },
    { command: 'contributors', description: 'Review care contributors' },
    { command: 'help', description: 'Ops bot help' }
  ]
};

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function webUrl(path = '') {
  return `${stripTrailingSlash(SERVER_CONFIG.ORIGINS.WEB)}${path}`;
}

function doctorUrl(path = '') {
  return `${stripTrailingSlash(SERVER_CONFIG.ORIGINS.DOCTOR)}${path}`;
}

function adminUrl(path = '') {
  return `${stripTrailingSlash(SERVER_CONFIG.ORIGINS.ADMIN)}${path}`;
}

export function telegramBotKindFromSlug(slug: string): TelegramBotKind | null {
  return (botKindBySlug as Record<string, TelegramBotKind | undefined>)[slug] ?? null;
}

export function telegramBotStatus() {
  return Object.values(TelegramBotKind).map((kind) => ({
    kind,
    slug: botSlugByKind[kind],
    name: botNameByKind[kind],
    configured: Boolean(process.env[botTokenEnvByKind[kind]]),
    tokenEnv: botTokenEnvByKind[kind]
  }));
}

export function telegramWebhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET || '';
}

export function telegramBotToken(kind: TelegramBotKind) {
  return process.env[botTokenEnvByKind[kind]] || '';
}

function getBotTokenOrThrow(kind: TelegramBotKind) {
  const token = telegramBotToken(kind);
  if (!token) throw new Error(`${botTokenEnvByKind[kind]} is not configured.`);
  return token;
}

async function callTelegramApi<T>(kind: TelegramBotKind, method: string, payload: unknown) {
  const token = getBotTokenOrThrow(kind);
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = (await response.json()) as { ok?: boolean; description?: string; result?: T };
  if (!response.ok || !body.ok) {
    throw new Error(body.description || `Telegram ${method} failed.`);
  }
  return body.result as T;
}

export function sendTelegramMessage(kind: TelegramBotKind, payload: SendMessagePayload) {
  return callTelegramApi(kind, 'sendMessage', payload);
}

export function answerTelegramCallback(
  kind: TelegramBotKind,
  callbackQueryId: string,
  text?: string
) {
  return callTelegramApi(kind, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  });
}

export async function setTelegramWebhook(input: {
  kind: TelegramBotKind;
  publicApiUrl: string;
  dropPendingUpdates?: boolean;
}) {
  const slug = botSlugByKind[input.kind];
  const secret = telegramWebhookSecret();
  return callTelegramApi(input.kind, 'setWebhook', {
    url: `${stripTrailingSlash(input.publicApiUrl)}/telegram/webhook/${slug}`,
    secret_token: secret || undefined,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: Boolean(input.dropPendingUpdates)
  });
}

export async function setTelegramCommands(kind: TelegramBotKind) {
  return callTelegramApi(kind, 'setMyCommands', {
    commands: commandMenus[kind]
  });
}

function menuFor(kind: TelegramBotKind): InlineButton[][] {
  if (kind === TelegramBotKind.USER) {
    return [
      [
        { text: 'Daily plan', callback_data: 'user:plan' },
        { text: 'Book session', callback_data: 'user:book' }
      ],
      [
        { text: 'Talk to volunteer', callback_data: 'user:volunteer' },
        { text: 'Crisis help', callback_data: 'user:crisis' }
      ],
      [{ text: 'Open Hope Hub', url: webUrl('/profile') }]
    ];
  }

  if (kind === TelegramBotKind.DOCTOR) {
    return [
      [
        { text: 'My queue', callback_data: 'doctor:queue' },
        { text: 'Go online', callback_data: 'doctor:online' }
      ],
      [
        { text: 'Appointments', url: doctorUrl('/appointments') },
        { text: 'Open doctor app', url: doctorUrl('/') }
      ]
    ];
  }

  return [
    [
      { text: 'New leads', callback_data: 'admin:leads' },
      { text: 'Care contributors', callback_data: 'admin:contributors' }
    ],
    [
      { text: 'Consultations', url: adminUrl('/consultations') },
      { text: 'Open admin', url: adminUrl('/') }
    ]
  ];
}

function startText(kind: TelegramBotKind, linked: boolean) {
  if (kind === TelegramBotKind.USER) {
    return [
      '<b>Welcome to Hope Hub.</b>',
      linked
        ? 'Your Telegram is linked to your Hope Hub account.'
        : 'Use this bot for care shortcuts. Account linking will come next.',
      '',
      'You can manage daily plans, book support, or reach the right help path.'
    ].join('\n');
  }

  if (kind === TelegramBotKind.DOCTOR) {
    return [
      '<b>Hope Hub Doctor Bot</b>',
      linked
        ? 'Your doctor account is linked.'
        : 'Use this bot as a shortcut panel. Secure account linking will come next.',
      '',
      'Open your queue, online controls, and appointments from here.'
    ].join('\n');
  }

  return [
    '<b>Hope Hub Ops Bot</b>',
    linked
      ? 'Your admin account is linked.'
      : 'Use this bot as an ops shortcut. Secure account linking will come next.',
    '',
    'Review leads, contributor applications, and operational queues.'
  ].join('\n');
}

function helpText(kind: TelegramBotKind) {
  if (kind === TelegramBotKind.USER) {
    return 'Use /plan for daily planning, /book to book support, or the menu buttons below. This bot is not an emergency service.';
  }
  if (kind === TelegramBotKind.DOCTOR) {
    return 'Use /queue for your consultation queue or /online for live doctor controls. Patient-sensitive actions still open in the secure doctor app.';
  }
  return 'Use /leads or /contributors for quick ops shortcuts. Sensitive actions still open in the secure admin panel.';
}

async function ensureSession(kind: TelegramBotKind, chat: TelegramChat, from?: TelegramUser) {
  const chatId = String(chat.id);
  return prisma.telegramBotSession.upsert({
    where: { botKind_chatId: { botKind: kind, chatId } },
    create: {
      botKind: kind,
      chatId,
      telegramUserId: from?.id ? String(from.id) : null,
      username: from?.username ?? null,
      firstName: from?.first_name ?? null,
      lastName: from?.last_name ?? null
    },
    update: {
      telegramUserId: from?.id ? String(from.id) : undefined,
      username: from?.username ?? undefined,
      firstName: from?.first_name ?? undefined,
      lastName: from?.last_name ?? undefined
    }
  });
}

async function logEvent(input: {
  kind: TelegramBotKind;
  sessionId?: string;
  updateId?: number;
  chatId?: string;
  eventType: string;
  payload?: unknown;
}) {
  await prisma.telegramBotEvent.create({
    data: {
      sessionId: input.sessionId,
      botKind: input.kind,
      updateId: input.updateId == null ? null : BigInt(input.updateId),
      chatId: input.chatId,
      eventType: input.eventType,
      payload: input.payload as Prisma.InputJsonValue
    }
  });
}

async function replyMenu(kind: TelegramBotKind, chatId: string, text: string) {
  await sendTelegramMessage(kind, {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: menuFor(kind) }
  });
}

async function handleCommand(kind: TelegramBotKind, chatId: string, text: string, linked: boolean) {
  const command = text.split(/\s+/)[0]?.toLowerCase() || '';

  if (command === '/start' || command === '/menu') {
    await replyMenu(kind, chatId, startText(kind, linked));
    return command;
  }

  if (command === '/help') {
    await replyMenu(kind, chatId, helpText(kind));
    return command;
  }

  if (kind === TelegramBotKind.USER && command === '/plan') {
    await sendTelegramMessage(kind, {
      chat_id: chatId,
      text: 'Open your Hope Hub profile to create, tick, review, and upload daily plan images.',
      reply_markup: { inline_keyboard: [[{ text: 'Open daily plan', url: webUrl('/profile') }]] }
    });
    return command;
  }

  if (kind === TelegramBotKind.USER && command === '/book') {
    await sendTelegramMessage(kind, {
      chat_id: chatId,
      text: 'You can book a Hope Hub session from the booking page.',
      reply_markup: { inline_keyboard: [[{ text: 'Book session', url: webUrl('/contact') }]] }
    });
    return command;
  }

  if (kind === TelegramBotKind.DOCTOR && command === '/queue') {
    await sendTelegramMessage(kind, {
      chat_id: chatId,
      text: 'Open your doctor queue in the secure doctor app.',
      reply_markup: { inline_keyboard: [[{ text: 'Open queue', url: doctorUrl('/appointments') }]] }
    });
    return command;
  }

  if (kind === TelegramBotKind.DOCTOR && command === '/online') {
    await sendTelegramMessage(kind, {
      chat_id: chatId,
      text: 'Open live doctor controls in the secure doctor app.',
      reply_markup: { inline_keyboard: [[{ text: 'Go online', url: doctorUrl('/online') }]] }
    });
    return command;
  }

  if (kind === TelegramBotKind.ADMIN && command === '/leads') {
    await sendTelegramMessage(kind, {
      chat_id: chatId,
      text: 'Open new leads in the admin panel.',
      reply_markup: { inline_keyboard: [[{ text: 'Open leads', url: adminUrl('/leads') }]] }
    });
    return command;
  }

  if (kind === TelegramBotKind.ADMIN && command === '/contributors') {
    await sendTelegramMessage(kind, {
      chat_id: chatId,
      text: 'Open care contributor applications in the admin panel.',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Review contributors', url: adminUrl('/counsellor-applications') }]
        ]
      }
    });
    return command;
  }

  await replyMenu(kind, chatId, 'Choose an option from the menu.');
  return 'message';
}

async function handleCallback(kind: TelegramBotKind, query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id == null ? null : String(query.message.chat.id);
  const data = query.data || '';
  if (!chatId) {
    await answerTelegramCallback(kind, query.id, 'Could not find this chat.');
    return;
  }

  await answerTelegramCallback(kind, query.id);

  const actions: Record<string, { text: string; url?: string }> = {
    'user:plan': { text: 'Open your daily plan and review page.', url: webUrl('/profile') },
    'user:book': { text: 'Book a Hope Hub session.', url: webUrl('/contact') },
    'user:volunteer': {
      text: 'Volunteer and peer support requests will be routed after we add secure assignment. For now, open Hope Hub support.',
      url: webUrl('/contact')
    },
    'user:crisis': {
      text: 'If there is immediate danger, contact local emergency services now. For Hope Hub support, use the crisis resources page.',
      url: webUrl('/crisis-support')
    },
    'doctor:queue': { text: 'Open your consultation queue.', url: doctorUrl('/appointments') },
    'doctor:online': { text: 'Open live doctor controls.', url: doctorUrl('/online') },
    'admin:leads': { text: 'Open new leads.', url: adminUrl('/leads') },
    'admin:contributors': {
      text: 'Open care contributor applications.',
      url: adminUrl('/counsellor-applications')
    }
  };

  const action = actions[data] ?? { text: 'Choose an option from the menu.' };
  await sendTelegramMessage(kind, {
    chat_id: chatId,
    text: action.text,
    reply_markup: action.url
      ? { inline_keyboard: [[{ text: 'Open', url: action.url }]] }
      : undefined
  });
}

export async function handleTelegramUpdate(kind: TelegramBotKind, update: TelegramUpdate) {
  const message = update.message;
  const callback = update.callback_query;

  if (message) {
    const chatId = String(message.chat.id);
    const session = await ensureSession(kind, message.chat, message.from);
    const command = await handleCommand(
      kind,
      chatId,
      message.text || '',
      Boolean(session.linkedUserId)
    );
    await prisma.telegramBotSession.update({
      where: { id: session.id },
      data: {
        state: command === 'message' ? 'ACTIVE' : 'COMMAND',
        lastCommand: command
      }
    });
    await logEvent({
      kind,
      sessionId: session.id,
      updateId: update.update_id,
      chatId,
      eventType: 'message',
      payload: { text: message.text || null }
    });
    return;
  }

  if (callback) {
    const chat = callback.message?.chat;
    const session = chat ? await ensureSession(kind, chat, callback.from) : null;
    await handleCallback(kind, callback);
    await logEvent({
      kind,
      sessionId: session?.id,
      updateId: update.update_id,
      chatId: chat?.id == null ? undefined : String(chat.id),
      eventType: 'callback_query',
      payload: { data: callback.data || null }
    });
    return;
  }

  await logEvent({
    kind,
    updateId: update.update_id,
    eventType: 'unsupported_update',
    payload: update
  });
}
