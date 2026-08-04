import {
  ConsultationStatus,
  CounsellorApplicationStatus,
  LivePresenceStatus,
  Prisma,
  Role,
  TelegramBotKind
} from '@prisma/client';
import { SERVER_CONFIG } from '../constants/config.constants.js';
import { prisma } from '../db.js';
import { getMailTransporter } from './mail.js';
import {
  devOtp,
  generateOtp,
  isProduction,
  sendOtpEmail,
  storeOtp,
  verifyOtpDetailed
} from './otp.js';
import { setDoctorLiveStatus } from './online-doctor-presence.js';
import { upsertWebsiteLead } from './website-leads.service.js';

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

type SessionMetadata = {
  pendingLink?: {
    email: string;
    otpKey: string;
    role: Role;
    requestedAt: string;
  };
  pendingLead?: {
    kind: 'BOOKING' | 'VOLUNTEER';
  };
  pendingTaskId?: string;
};

type TelegramSession = Awaited<ReturnType<typeof ensureSession>>;

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

const roleByKind: Record<TelegramBotKind, Role> = {
  [TelegramBotKind.USER]: Role.PATIENT,
  [TelegramBotKind.DOCTOR]: Role.DOCTOR,
  [TelegramBotKind.ADMIN]: Role.ADMIN
};

const botNameByKind: Record<TelegramBotKind, string> = {
  [TelegramBotKind.USER]: 'Hope Hub Care Bot',
  [TelegramBotKind.DOCTOR]: 'Hope Hub Doctor Bot',
  [TelegramBotKind.ADMIN]: 'Hope Hub Ops Bot'
};

const commandMenus: Record<TelegramBotKind, { command: string; description: string }[]> = {
  [TelegramBotKind.USER]: [
    { command: 'start', description: 'Open care menu' },
    { command: 'link', description: 'Link Hope Hub account' },
    { command: 'plan', description: 'Daily plan and review' },
    { command: 'addtask', description: 'Add a daily task' },
    { command: 'review', description: 'Save daily review' },
    { command: 'book', description: 'Request a session' },
    { command: 'volunteer', description: 'Request volunteer support' },
    { command: 'me', description: 'Show linked account' },
    { command: 'help', description: 'Get help' }
  ],
  [TelegramBotKind.DOCTOR]: [
    { command: 'start', description: 'Open doctor menu' },
    { command: 'link', description: 'Link doctor account' },
    { command: 'queue', description: 'Show consultation queue' },
    { command: 'online', description: 'Go online' },
    { command: 'offline', description: 'Go offline' },
    { command: 'me', description: 'Show linked account' },
    { command: 'help', description: 'Doctor bot help' }
  ],
  [TelegramBotKind.ADMIN]: [
    { command: 'start', description: 'Open ops menu' },
    { command: 'link', description: 'Link admin account' },
    { command: 'summary', description: 'Ops summary' },
    { command: 'leads', description: 'New leads' },
    { command: 'contributors', description: 'Contributor applications' },
    { command: 'me', description: 'Show linked account' },
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

function escapeHtml(value: string | null | undefined) {
  return (value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function todayStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function metadataOf(session: { metadata?: Prisma.JsonValue | null }): SessionMetadata {
  if (
    !session.metadata ||
    typeof session.metadata !== 'object' ||
    Array.isArray(session.metadata)
  ) {
    return {};
  }
  return session.metadata as SessionMetadata;
}

function telegramDisplayName(session: TelegramSession) {
  return session.firstName || session.username || 'Telegram user';
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
  const token = telegramBotToken(kind).trim();
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

function menuFor(kind: TelegramBotKind, linked: boolean): InlineButton[][] {
  if (kind === TelegramBotKind.USER) {
    return [
      [
        { text: 'Daily plan', callback_data: 'user:plan' },
        { text: 'Add task', callback_data: 'user:addtask' }
      ],
      [
        { text: 'Book session', callback_data: 'user:book' },
        { text: 'Volunteer support', callback_data: 'user:volunteer' }
      ],
      [
        linked
          ? { text: 'My account', callback_data: 'common:me' }
          : { text: 'Link account', callback_data: 'common:link' },
        { text: 'Open Hope Hub', url: webUrl('/profile') }
      ]
    ];
  }

  if (kind === TelegramBotKind.DOCTOR) {
    return [
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

function helpText(kind: TelegramBotKind) {
  if (kind === TelegramBotKind.USER) {
    return [
      '<b>Care bot commands</b>',
      '/link email@example.com - link your account',
      '/plan - show today plan',
      '/addtask - add a task',
      '/review - save end-of-day review',
      '/book - request a session',
      '/volunteer - request volunteer support',
      '',
      'This bot is not an emergency service.'
    ].join('\n');
  }
  if (kind === TelegramBotKind.DOCTOR) {
    return [
      '<b>Doctor bot commands</b>',
      '/link doctor@example.com - link doctor account',
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

function startGuideText(kind: TelegramBotKind, session: TelegramSession) {
  const linkedLine = session.linkedUser
    ? `Linked as ${escapeHtml(session.linkedUser.name)}.`
    : 'Not linked yet. Send /link your-email@example.com, then /verify OTP.';

  if (kind === TelegramBotKind.USER) {
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
      '• Request volunteer support',
      '',
      '<b>Safety guideline</b>',
      'This bot is not an emergency service and does not replace a doctor, psychologist, or crisis helpline. If there is immediate danger, contact local emergency services now.',
      '',
      '<b>Privacy guideline</b>',
      'Avoid sharing highly sensitive personal details in Telegram. For private records, use the Hope Hub app/profile.',
      '',
      'Start with /link, /plan, /book, or /help.'
    ].join('\n');
  }

  if (kind === TelegramBotKind.DOCTOR) {
    return [
      '<b>Hope Hub Provider Bot</b>',
      linkedLine,
      '',
      '<b>Purpose</b>',
      'This bot gives providers quick access to queue status and online availability controls.',
      '',
      '<b>What you can do</b>',
      '• View assigned queue summary',
      '• Mark yourself online/offline',
      '• Open the secure doctor panel',
      '',
      '<b>Clinical privacy guideline</b>',
      'Do not share diagnosis, prescriptions, or detailed patient records inside Telegram. Use the secure doctor app for clinical work.',
      '',
      'Start with /link, /queue, /online, or /help.'
    ].join('\n');
  }

  return [
    '<b>Hope Hub Ops Bot</b>',
    linkedLine,
    '',
    '<b>Purpose</b>',
    'This bot helps admins monitor leads, contributor applications, and operational workload from Telegram.',
    '',
    '<b>What you can do</b>',
    '• See ops summary',
    '• Review latest leads',
    '• Check contributor application queue',
    '• Open secure admin pages',
    '',
    '<b>Security guideline</b>',
    'Admin actions are role-gated. Do not paste patient-sensitive details in Telegram; use the admin panel for private records and approvals.',
    '',
    'Start with /link, /summary, /leads, or /help.'
  ].join('\n');
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
    },
    include: {
      linkedUser: {
        select: { id: true, name: true, email: true, mobile: true, role: true, isActive: true }
      }
    }
  });
}

async function updateSession(session: TelegramSession, data: Prisma.TelegramBotSessionUpdateInput) {
  return prisma.telegramBotSession.update({
    where: { id: session.id },
    data,
    include: {
      linkedUser: {
        select: { id: true, name: true, email: true, mobile: true, role: true, isActive: true }
      }
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

async function replyMenu(kind: TelegramBotKind, session: TelegramSession, text: string) {
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: menuFor(kind, Boolean(session.linkedUserId)) }
  });
}

function assertLinkedRole(kind: TelegramBotKind, session: TelegramSession) {
  const expectedRole = roleByKind[kind];
  return Boolean(
    session.linkedUserId &&
    session.linkedUser &&
    session.linkedUser.role === expectedRole &&
    session.linkedUser.isActive
  );
}

async function requireLinked(kind: TelegramBotKind, session: TelegramSession) {
  if (assertLinkedRole(kind, session)) return true;
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      'Please link your Hope Hub account first.',
      '',
      `Send: /link your-email@example.com`,
      'Then reply with /verify 123456 after the OTP arrives.'
    ].join('\n')
  });
  return false;
}

async function startLink(kind: TelegramBotKind, session: TelegramSession, emailText?: string) {
  const email = (emailText || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: `Send your email like this:\n/link your-email@example.com`
    });
    return;
  }

  const expectedRole = roleByKind[kind];
  const user = await prisma.user.findFirst({
    where: { email, role: expectedRole, isActive: true },
    select: { id: true, email: true, name: true, role: true }
  });

  if (!user) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: `No active ${expectedRole.toLowerCase()} account was found for this email.`
    });
    return;
  }

  if (isProduction && !getMailTransporter()) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Email OTP delivery is not configured right now. Please try later.'
    });
    return;
  }

  const otp = isProduction ? generateOtp() : devOtp;
  const otpKey = `telegram:${kind}:${session.id}:${email}`;
  await storeOtp(otpKey, otp);
  if (isProduction) {
    await sendOtpEmail(email, otp);
  } else {
    console.info(`[telegram] DEV OTP for ${email}: ${otp}`);
  }

  const metadata: SessionMetadata = {
    ...metadataOf(session),
    pendingLink: {
      email,
      otpKey,
      role: expectedRole,
      requestedAt: new Date().toISOString()
    }
  };

  await updateSession(session, {
    state: 'LINK_OTP',
    metadata: metadata as Prisma.InputJsonValue,
    lastCommand: '/link'
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `OTP sent to ${email}.\nReply with: /verify 123456`
  });
}

async function verifyLink(kind: TelegramBotKind, session: TelegramSession, otpText?: string) {
  const metadata = metadataOf(session);
  const pending = metadata.pendingLink;
  const otp = (otpText || '').trim();
  if (!pending || !otp) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'No pending link request. Send /link your-email@example.com first.'
    });
    return;
  }

  const result = await verifyOtpDetailed(pending.otpKey, otp);
  if (!result.ok) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Invalid or expired OTP. Send /link your-email@example.com to request a fresh one.'
    });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: pending.email, role: pending.role, isActive: true },
    select: { id: true, name: true, email: true, role: true }
  });
  if (!user) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'The account could not be linked. Please contact support.'
    });
    return;
  }

  const nextMetadata: SessionMetadata = { ...metadata };
  delete nextMetadata.pendingLink;
  const linkedSession = await updateSession(session, {
    linkedUser: { connect: { id: user.id } },
    state: 'ACTIVE',
    metadata: nextMetadata as Prisma.InputJsonValue,
    lastCommand: '/verify'
  });

  await replyMenu(
    kind,
    linkedSession,
    `<b>Linked.</b>\n${escapeHtml(user.name)} is now connected to this ${botNameByKind[kind]}.`
  );
}

async function unlink(kind: TelegramBotKind, session: TelegramSession) {
  const updated = await updateSession(session, {
    linkedUser: { disconnect: true },
    state: 'ACTIVE',
    metadata: {},
    lastCommand: '/unlink'
  });
  await replyMenu(kind, updated, 'Telegram account unlinked.');
}

async function showMe(kind: TelegramBotKind, session: TelegramSession) {
  if (!session.linkedUser) {
    await requireLinked(kind, session);
    return;
  }
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Linked account</b>',
      `Name: ${escapeHtml(session.linkedUser.name)}`,
      `Role: ${session.linkedUser.role}`,
      `Email: ${escapeHtml(session.linkedUser.email || 'Not added')}`
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Unlink', callback_data: 'common:unlink' }],
        [{ text: 'Menu', callback_data: 'common:menu' }]
      ]
    }
  });
}

async function ensureTodayPlan(userId: string) {
  const planDate = todayStart();
  return prisma.patientDailyPlan.upsert({
    where: { userId_planDate: { userId, planDate } },
    create: {
      userId,
      planDate,
      title: 'Today plan',
      focus: 'Small steady steps',
      tasks: {
        create: [
          { title: 'One grounding practice', sortOrder: 0 },
          { title: 'One practical task', sortOrder: 1 },
          { title: 'One connection or self-care step', sortOrder: 2 }
        ]
      }
    },
    update: {},
    include: {
      tasks: { orderBy: { sortOrder: 'asc' } },
      images: { where: { taskId: null }, orderBy: { createdAt: 'desc' } }
    }
  });
}

async function showUserPlan(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const plan = await ensureTodayPlan(session.linkedUserId!);
  const done = plan.tasks.filter((task) => task.completed).length;
  const taskLines = plan.tasks.length
    ? plan.tasks
        .map(
          (task, index) => `${task.completed ? '✓' : '☐'} ${index + 1}. ${escapeHtml(task.title)}`
        )
        .join('\n')
    : 'No tasks yet.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      `<b>${escapeHtml(plan.title)}</b>`,
      `${done}/${plan.tasks.length} tasks done`,
      '',
      taskLines,
      plan.reviewNote ? `\nReview: ${escapeHtml(plan.reviewNote)}` : ''
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...plan.tasks.slice(0, 8).map((task) => [
          {
            text: `${task.completed ? 'Undo' : 'Done'}: ${task.title.slice(0, 24)}`,
            callback_data: `user:task:${task.id}`
          }
        ]),
        [
          { text: 'Add task', callback_data: 'user:addtask' },
          { text: 'Review day', callback_data: 'user:review' }
        ],
        [{ text: 'Open full profile', url: webUrl('/profile') }]
      ]
    }
  });
}

async function promptAddTask(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  await updateSession(session, { state: 'WAITING_USER_PLAN_TASK', lastCommand: '/addtask' });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: 'Send the task you want to add for today.'
  });
}

async function addTaskFromText(kind: TelegramBotKind, session: TelegramSession, text: string) {
  if (!(await requireLinked(kind, session))) return;
  const title = text.trim().slice(0, 160);
  if (!title) {
    await sendTelegramMessage(kind, { chat_id: session.chatId, text: 'Please send a task title.' });
    return;
  }
  const plan = await ensureTodayPlan(session.linkedUserId!);
  await prisma.patientDailyPlanTask.create({
    data: {
      planId: plan.id,
      title,
      sortOrder: plan.tasks.length
    }
  });
  const updated = await updateSession(session, { state: 'ACTIVE', lastCommand: '/addtask' });
  await sendTelegramMessage(kind, { chat_id: session.chatId, text: 'Task added.' });
  await showUserPlan(kind, updated);
}

async function promptReview(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  await updateSession(session, { state: 'WAITING_USER_PLAN_REVIEW', lastCommand: '/review' });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: 'Send your end-of-day review note.'
  });
}

async function saveReviewFromText(kind: TelegramBotKind, session: TelegramSession, text: string) {
  if (!(await requireLinked(kind, session))) return;
  const plan = await ensureTodayPlan(session.linkedUserId!);
  await prisma.patientDailyPlan.update({
    where: { id: plan.id },
    data: { reviewNote: text.trim().slice(0, 2000) || null, reviewedAt: new Date() }
  });
  const updated = await updateSession(session, { state: 'ACTIVE', lastCommand: '/review' });
  await sendTelegramMessage(kind, { chat_id: session.chatId, text: 'Review saved.' });
  await showUserPlan(kind, updated);
}

async function toggleTask(kind: TelegramBotKind, session: TelegramSession, taskId: string) {
  if (!(await requireLinked(kind, session))) return;
  const task = await prisma.patientDailyPlanTask.findFirst({
    where: { id: taskId, plan: { userId: session.linkedUserId! } }
  });
  if (!task) {
    await sendTelegramMessage(kind, { chat_id: session.chatId, text: 'Task not found.' });
    return;
  }
  await prisma.patientDailyPlanTask.update({
    where: { id: task.id },
    data: {
      completed: !task.completed,
      completedAt: task.completed ? null : new Date(),
      reviewTick: !task.completed || task.reviewTick
    }
  });
  await showUserPlan(kind, session);
}

async function promptLead(
  kind: TelegramBotKind,
  session: TelegramSession,
  leadKind: 'BOOKING' | 'VOLUNTEER'
) {
  const metadata: SessionMetadata = {
    ...metadataOf(session),
    pendingLead: { kind: leadKind }
  };
  await updateSession(session, {
    state: 'WAITING_LEAD_CONCERN',
    metadata: metadata as Prisma.InputJsonValue,
    lastCommand: leadKind === 'BOOKING' ? '/book' : '/volunteer'
  });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text:
      leadKind === 'BOOKING'
        ? 'Tell us what you need help with and your preferred callback time.'
        : 'Tell us what kind of volunteer support you want and your preferred callback time.'
  });
}

async function createLeadFromText(kind: TelegramBotKind, session: TelegramSession, text: string) {
  const metadata = metadataOf(session);
  const leadKind = metadata.pendingLead?.kind ?? 'BOOKING';
  const linkedUser = session.linkedUser;
  const name = linkedUser?.name || telegramDisplayName(session);
  const concernPrefix =
    leadKind === 'VOLUNTEER' ? 'Volunteer support request' : 'Telegram booking request';
  const lead = await upsertWebsiteLead({
    source: 'CHAT_BOT',
    visitorName: name,
    visitorEmail: linkedUser?.email ?? null,
    visitorPhone: linkedUser?.mobile ?? null,
    visitorKey: `telegram:${session.botKind}:${session.chatId}`,
    concern: `${concernPrefix}: ${text.trim().slice(0, 1200)}`,
    entryPage: `telegram:${botSlugByKind[session.botKind]}`,
    userId: linkedUser?.id ?? null
  });

  const nextMetadata: SessionMetadata = { ...metadata };
  delete nextMetadata.pendingLead;
  const updated = await updateSession(session, {
    state: 'ACTIVE',
    metadata: nextMetadata as Prisma.InputJsonValue,
    lastCommand: leadKind === 'BOOKING' ? '/book' : '/volunteer'
  });

  await replyMenu(
    kind,
    updated,
    `Request saved. Ops can now follow up.\nLead ID: ${escapeHtml(lead.id.slice(-8))}`
  );
}

async function doctorQueue(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const consultations = await prisma.consultation.findMany({
    where: {
      assignedDoctorId: session.linkedUserId!,
      status: { notIn: [ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED] }
    },
    include: {
      patient: { select: { name: true, patientCode: true } },
      disease: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  const counts = await prisma.consultation.groupBy({
    by: ['status'],
    where: {
      assignedDoctorId: session.linkedUserId!,
      status: { notIn: [ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED] }
    },
    _count: { _all: true }
  });
  const countText =
    counts.map((item) => `${item.status}: ${item._count._all}`).join('\n') || 'No open cases.';
  const rows =
    consultations
      .map(
        (item, index) =>
          `${index + 1}. ${escapeHtml(item.patient.name)} (${escapeHtml(item.patient.patientCode || '-')}) - ${escapeHtml(item.disease.name)}`
      )
      .join('\n') || 'Your queue is clear.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [`<b>Doctor queue</b>`, countText, '', rows].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Open appointments', url: doctorUrl('/appointments') }]]
    }
  });
}

async function setDoctorPresence(kind: TelegramBotKind, session: TelegramSession, online: boolean) {
  if (!(await requireLinked(kind, session))) return;
  const profile = await setDoctorLiveStatus(session.linkedUserId!, {
    liveStatus: online ? LivePresenceStatus.ONLINE : LivePresenceStatus.OFFLINE
  });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: profile
      ? `Doctor status updated: ${online ? 'ONLINE' : 'OFFLINE'}`
      : 'Doctor profile was not found.'
  });
}

async function adminSummary(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const [newLeads, callbackLeads, newContributors, shortlistedContributors, openConsultations] =
    await Promise.all([
      prisma.websiteLead.count({ where: { followUpStatus: 'NEW' } }),
      prisma.websiteLead.count({ where: { followUpStatus: 'NEEDS_CALLBACK' } }),
      prisma.counsellorApplication.count({ where: { status: CounsellorApplicationStatus.NEW } }),
      prisma.counsellorApplication.count({
        where: { status: CounsellorApplicationStatus.SHORTLISTED }
      }),
      prisma.consultation.count({
        where: {
          status: {
            in: [
              ConsultationStatus.PAID,
              ConsultationStatus.ASSIGNED,
              ConsultationStatus.IN_PROGRESS
            ]
          }
        }
      })
    ]);

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Hope Hub ops summary</b>',
      `New leads: ${newLeads}`,
      `Needs callback: ${callbackLeads}`,
      `New contributor applications: ${newContributors}`,
      `Shortlisted contributors: ${shortlistedContributors}`,
      `Open consultations: ${openConsultations}`
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Open leads', url: adminUrl('/visitor-leads') },
          { text: 'Contributors', url: adminUrl('/counsellor-applications') }
        ]
      ]
    }
  });
}

async function adminLeads(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const leads = await prisma.websiteLead.findMany({
    where: { followUpStatus: { in: ['NEW', 'NEEDS_CALLBACK'] } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  const rows =
    leads
      .map(
        (lead, index) =>
          `${index + 1}. ${escapeHtml(lead.visitorName || 'Visitor')} - ${escapeHtml(lead.concern || 'No concern added')}`
      )
      .join('\n') || 'No fresh leads.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `<b>Latest leads</b>\n${rows}`,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: 'Open leads', url: adminUrl('/visitor-leads') }]] }
  });
}

async function adminContributors(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const applications = await prisma.counsellorApplication.findMany({
    where: {
      status: {
        in: [
          CounsellorApplicationStatus.NEW,
          CounsellorApplicationStatus.REVIEWING,
          CounsellorApplicationStatus.SHORTLISTED
        ]
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  const rows =
    applications
      .map(
        (app, index) =>
          `${index + 1}. ${escapeHtml(app.fullName)} - ${app.applicationTrack} - ${app.status}`
      )
      .join('\n') || 'No pending contributor applications.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `<b>Contributor applications</b>\n${rows}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Open contributors', url: adminUrl('/counsellor-applications') }]]
    }
  });
}

async function handlePendingState(kind: TelegramBotKind, session: TelegramSession, text: string) {
  if (session.state === 'LINK_OTP' && /^\d{4,8}$/.test(text.trim())) {
    await verifyLink(kind, session, text);
    return true;
  }
  if (session.state === 'WAITING_USER_PLAN_TASK') {
    await addTaskFromText(kind, session, text);
    return true;
  }
  if (session.state === 'WAITING_USER_PLAN_REVIEW') {
    await saveReviewFromText(kind, session, text);
    return true;
  }
  if (session.state === 'WAITING_LEAD_CONCERN') {
    await createLeadFromText(kind, session, text);
    return true;
  }
  return false;
}

async function handleCommand(kind: TelegramBotKind, session: TelegramSession, text: string) {
  const [commandRaw, ...rest] = text.trim().split(/\s+/);
  const command = (commandRaw || '').toLowerCase();
  const argText = rest.join(' ');

  if (!command || !command.startsWith('/')) {
    if (await handlePendingState(kind, session, text)) return 'state';
    await replyMenu(kind, session, 'Choose an option or send /help.');
    return 'message';
  }

  if (command === '/start' || command === '/menu') {
    await replyMenu(kind, session, startGuideText(kind, session));
    return command;
  }

  if (command === '/help') {
    await replyMenu(kind, session, helpText(kind));
    return command;
  }

  if (command === '/link') {
    await startLink(kind, session, argText);
    return command;
  }

  if (command === '/verify') {
    await verifyLink(kind, session, argText);
    return command;
  }

  if (command === '/unlink') {
    await unlink(kind, session);
    return command;
  }

  if (command === '/me') {
    await showMe(kind, session);
    return command;
  }

  if (kind === TelegramBotKind.USER) {
    if (command === '/plan') await showUserPlan(kind, session);
    else if (command === '/addtask') await promptAddTask(kind, session);
    else if (command === '/review') await promptReview(kind, session);
    else if (command === '/book') await promptLead(kind, session, 'BOOKING');
    else if (command === '/volunteer') await promptLead(kind, session, 'VOLUNTEER');
    else await replyMenu(kind, session, 'Choose an option or send /help.');
    return command;
  }

  if (kind === TelegramBotKind.DOCTOR) {
    if (command === '/queue') await doctorQueue(kind, session);
    else if (command === '/online') await setDoctorPresence(kind, session, true);
    else if (command === '/offline') await setDoctorPresence(kind, session, false);
    else await replyMenu(kind, session, 'Choose an option or send /help.');
    return command;
  }

  if (command === '/summary') await adminSummary(kind, session);
  else if (command === '/leads') await adminLeads(kind, session);
  else if (command === '/contributors') await adminContributors(kind, session);
  else await replyMenu(kind, session, 'Choose an option or send /help.');
  return command;
}

async function handleCallback(
  kind: TelegramBotKind,
  session: TelegramSession,
  query: TelegramCallbackQuery
) {
  const data = query.data || '';
  await answerTelegramCallback(kind, query.id);

  if (data === 'common:menu') {
    await replyMenu(kind, session, 'Menu');
    return;
  }
  if (data === 'common:link') {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Send /link your-email@example.com to receive an OTP.'
    });
    return;
  }
  if (data === 'common:me') {
    await showMe(kind, session);
    return;
  }
  if (data === 'common:unlink') {
    await unlink(kind, session);
    return;
  }

  if (kind === TelegramBotKind.USER) {
    if (data === 'user:plan') await showUserPlan(kind, session);
    else if (data === 'user:addtask') await promptAddTask(kind, session);
    else if (data === 'user:review') await promptReview(kind, session);
    else if (data === 'user:book') await promptLead(kind, session, 'BOOKING');
    else if (data === 'user:volunteer') await promptLead(kind, session, 'VOLUNTEER');
    else if (data.startsWith('user:task:'))
      await toggleTask(kind, session, data.slice('user:task:'.length));
    else await replyMenu(kind, session, 'Choose an option from the menu.');
    return;
  }

  if (kind === TelegramBotKind.DOCTOR) {
    if (data === 'doctor:queue') await doctorQueue(kind, session);
    else if (data === 'doctor:online') await setDoctorPresence(kind, session, true);
    else if (data === 'doctor:offline') await setDoctorPresence(kind, session, false);
    else await replyMenu(kind, session, 'Choose an option from the menu.');
    return;
  }

  if (data === 'admin:summary') await adminSummary(kind, session);
  else if (data === 'admin:leads') await adminLeads(kind, session);
  else if (data === 'admin:contributors') await adminContributors(kind, session);
  else await replyMenu(kind, session, 'Choose an option from the menu.');
}

export async function handleTelegramUpdate(kind: TelegramBotKind, update: TelegramUpdate) {
  const message = update.message;
  const callback = update.callback_query;

  if (message) {
    const session = await ensureSession(kind, message.chat, message.from);
    const command = await handleCommand(kind, session, message.text || '');
    await prisma.telegramBotSession.update({
      where: { id: session.id },
      data: { lastCommand: command }
    });
    await logEvent({
      kind,
      sessionId: session.id,
      updateId: update.update_id,
      chatId: session.chatId,
      eventType: 'message',
      payload: { text: message.text || null }
    });
    return;
  }

  if (callback?.message?.chat) {
    const session = await ensureSession(kind, callback.message.chat, callback.from);
    await handleCallback(kind, session, callback);
    await logEvent({
      kind,
      sessionId: session.id,
      updateId: update.update_id,
      chatId: session.chatId,
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
