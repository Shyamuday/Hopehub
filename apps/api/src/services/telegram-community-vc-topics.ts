import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  isTelegramMessageNotModifiedError,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import type {
  CommunityTelegramUpdate,
  CommunityTelegramUser,
  TelegramKeyboard
} from './telegram-community-bots.types.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import { messageForGroupHelpTarget } from './telegram-group-help.command-context.js';
import { canUseGroupHelpCommand } from './telegram-group-help.permissions.js';
import { telegramPersonLogLabel, telegramPersonName } from './telegram-group-help.people.js';

const VC_TOPIC_PLAN_STATE = 'TELEGRAM_DAILY_VC_TOPIC_PLAN';
const PLAN_RETENTION_DAYS = 400;
const MAX_DAILY_VC_SLOTS = 5;
const TOPIC_FRAMES = [
  (root: string) => `Let’s talk about ${root}`,
  (root: string) => `Real experiences: ${root}`,
  (root: string) => `What helps with ${root}?`,
  (root: string) => `A practical conversation on ${root}`,
  (root: string) => `Understanding ${root} together`,
  (root: string) => `Small steps for ${root}`,
  (root: string) => `Honest reflections on ${root}`,
  (root: string) => `Support circle: ${root}`,
  (root: string) => `Common myths about ${root}`,
  (root: string) => `What we wish others understood about ${root}`
] as const;

type VcTopicAssignment = {
  telegramUserId: string;
  name: string;
  username?: string;
  selectedAt: string;
};

export type VcTopicSlot = {
  eventId: string;
  startsAt: string;
  topic: string;
  assignment?: VcTopicAssignment;
};

export type VcTopicPlanPayload = {
  version: 1;
  dateKey: string;
  groupChatId: string;
  staffChatId: string;
  slots: VcTopicSlot[];
  publicMessageId?: number;
  staffMessageId?: number;
  topicLibraryHash: string;
};

export type VcTopicCallbackResult = 'claimed' | 'already-claimed' | 'rsvp' | 'denied' | 'expired';

function planPayload(value: Prisma.JsonValue | null | undefined): VcTopicPlanPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const payload = value as unknown as Partial<VcTopicPlanPayload>;
  if (
    payload.version !== 1 ||
    typeof payload.dateKey !== 'string' ||
    typeof payload.groupChatId !== 'string' ||
    typeof payload.staffChatId !== 'string' ||
    !Array.isArray(payload.slots)
  ) {
    return null;
  }
  return payload as VcTopicPlanPayload;
}

export function indiaDateKey(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function indiaDayWindow(now: Date) {
  const dateKey = indiaDateKey(now);
  const start = new Date(`${dateKey}T00:00:00+05:30`);
  return { dateKey, start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function indiaMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  return value('hour') * 60 + value('minute');
}

function configuredPromptMinutes(value: string | undefined) {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 9 * 60;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : 9 * 60;
}

function normalizedTopic(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IN');
}

export function buildVcTopicCatalog(rootsValue: string) {
  const roots = [...new Set(rootsValue.split(/\r?\n/).map(normalizedTopic).filter(Boolean))];
  return roots.flatMap((root) => TOPIC_FRAMES.map((frame) => frame(root)));
}

function stableTopicOrder(topic: string, dateKey: string) {
  return createHash('sha256').update(`${dateKey}:${topic}`).digest('hex');
}

export function selectUnusedVcTopics(input: {
  rootsValue: string;
  usedTopics: Iterable<string>;
  count: number;
  dateKey: string;
}) {
  const used = new Set([...input.usedTopics].map(normalizedTopic));
  return buildVcTopicCatalog(input.rootsValue)
    .filter((topic) => !used.has(normalizedTopic(topic)))
    .sort((left, right) =>
      stableTopicOrder(left, input.dateKey).localeCompare(stableTopicOrder(right, input.dateKey))
    )
    .slice(0, input.count);
}

function formatIndiaTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(value));
}

function formatIndiaDay(value: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(value));
}

function rowsOfTwo<T>(values: T[]) {
  const rows: T[][] = [];
  for (let index = 0; index < values.length; index += 2) rows.push(values.slice(index, index + 2));
  return rows;
}

export function vcTopicStaffBoard(plan: VcTopicPlanPayload) {
  const lines = [
    'Today’s VC topics',
    '',
    `Choose the time and topic you will host on ${formatIndiaDay(plan.slots[0]?.startsAt || new Date())}.`,
    'You may choose more than one slot. Your real display name will be shown in the private confirmation and the public schedule.',
    ''
  ];
  for (const [index, slot] of plan.slots.entries()) {
    lines.push(
      `${index + 1}. ${formatIndiaTime(slot.startsAt)} — ${slot.topic}`,
      slot.assignment ? `Selected by: ${slot.assignment.name}` : 'Host: waiting for selection',
      ''
    );
  }
  const buttons = plan.slots.map((slot) => ({
    text: slot.assignment
      ? `${formatIndiaTime(slot.startsAt)} · ${slot.assignment.name}`
      : `Choose ${formatIndiaTime(slot.startsAt)}`,
    callback_data: `vc_claim:${slot.eventId}`,
    style: 'success' as const
  }));
  return { text: lines.join('\n').trim(), keyboard: { inline_keyboard: rowsOfTwo(buttons) } };
}

export function vcTopicPublicBoard(plan: VcTopicPlanPayload, rsvpCounts: Record<string, number>) {
  const lines = [
    'Today’s Hope Hub voice circles',
    '',
    `${formatIndiaDay(plan.slots[0]?.startsAt || new Date())} · Join the conversations that feel useful to you.`,
    ''
  ];
  for (const [index, slot] of plan.slots.entries()) {
    lines.push(
      `${index + 1}. ${formatIndiaTime(slot.startsAt)} — ${slot.topic}`,
      slot.assignment ? `Host: ${slot.assignment.name}` : 'Host will be confirmed by the team.',
      ''
    );
  }
  lines.push('Select one or several time slots below. Telegram will keep your RSVP for each VC.');
  const buttons = plan.slots.map((slot) => ({
    text: `${formatIndiaTime(slot.startsAt)} · Join (${rsvpCounts[slot.eventId] || 0})`,
    callback_data: `vc_rsvp:${slot.eventId}`,
    style: 'success' as const
  }));
  return { text: lines.join('\n'), keyboard: { inline_keyboard: rowsOfTwo(buttons) } };
}

async function editPlanMessage(
  chatId: string,
  messageId: number,
  text: string,
  keyboard: TelegramKeyboard
) {
  try {
    await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      reply_markup: keyboard
    });
  } catch (error) {
    if (!isTelegramMessageNotModifiedError(error)) throw error;
  }
}

async function rsvpCounts(plan: VcTopicPlanPayload) {
  const counts = await prisma.telegramCommunityEventRsvp.groupBy({
    by: ['eventId'],
    where: { eventId: { in: plan.slots.map((slot) => slot.eventId) }, status: 'GOING' },
    _count: { _all: true }
  });
  return Object.fromEntries(counts.map((entry) => [entry.eventId, entry._count._all]));
}

async function refreshPlanMessages(plan: VcTopicPlanPayload) {
  const tasks: Promise<unknown>[] = [];
  if (plan.staffMessageId) {
    const board = vcTopicStaffBoard(plan);
    tasks.push(editPlanMessage(plan.staffChatId, plan.staffMessageId, board.text, board.keyboard));
  }
  if (plan.publicMessageId) {
    const board = vcTopicPublicBoard(plan, await rsvpCounts(plan));
    tasks.push(editPlanMessage(plan.groupChatId, plan.publicMessageId, board.text, board.keyboard));
  }
  await Promise.all(tasks);
}

async function recentTopicPlans() {
  return prisma.telegramCommunityState.findMany({
    where: { bot: VC_TOPIC_PLAN_STATE },
    select: { payload: true },
    orderBy: { createdAt: 'desc' },
    take: PLAN_RETENTION_DAYS
  });
}

function topicLibraryHash(value: string) {
  return createHash('sha256').update(value.trim()).digest('hex').slice(0, 16);
}

async function notifyTopicLibraryNeedsAttention(input: {
  stateChatId: string;
  existingPayload: VcTopicPlanPayload | null;
  staffChatId: string;
  groupChatId: string;
  dateKey: string;
  available: number;
  required: number;
  libraryHash: string;
  now: Date;
}) {
  if (input.existingPayload?.topicLibraryHash === input.libraryHash) return;
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot: VC_TOPIC_PLAN_STATE, chatId: input.stateChatId } },
    create: {
      bot: VC_TOPIC_PLAN_STATE,
      chatId: input.stateChatId,
      state: 'WAITING_FOR_TOPICS',
      payload: {
        version: 1,
        dateKey: input.dateKey,
        groupChatId: input.groupChatId,
        staffChatId: input.staffChatId,
        slots: [],
        topicLibraryHash: input.libraryHash
      },
      expiresAt: new Date(input.now.getTime() + PLAN_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    },
    update: {
      state: 'WAITING_FOR_TOPICS',
      payload: {
        version: 1,
        dateKey: input.dateKey,
        groupChatId: input.groupChatId,
        staffChatId: input.staffChatId,
        slots: [],
        topicLibraryHash: input.libraryHash
      }
    }
  });
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    input.staffChatId,
    [
      'VC topic planner needs more topics',
      '',
      `Unused topics available: ${input.available}`,
      `Today’s VC slots: ${input.required}`,
      '',
      'Add new lines to “VC topic library” in Admin → Group Help → Content. The bot will retry automatically and will not repeat an old topic.'
    ].join('\n')
  );
}

export async function runTelegramDailyVcTopicPlanner(now = new Date()) {
  const baseValues = await groupHelpConfig();
  if (baseValues.telegramCommunityVcTopicPlannerEnabled === 'Disabled') return false;
  if (indiaMinutes(now) < configuredPromptMinutes(baseValues.telegramCommunityVcTopicPromptTime)) {
    return false;
  }
  const groupChatId = baseValues.telegramGroupHelpGroupChatId?.trim();
  const staffChatId = baseValues.telegramGroupHelpStaffGroupId?.trim();
  if (!groupChatId || !staffChatId) return false;

  const { dateKey, end } = indiaDayWindow(now);
  const stateChatId = `${groupChatId}:${dateKey}`;
  const stateKey = { bot_chatId: { bot: VC_TOPIC_PLAN_STATE, chatId: stateChatId } };
  const existing = await prisma.telegramCommunityState.findUnique({ where: stateKey });
  const existingPayload = planPayload(existing?.payload);
  if (existing?.state === 'ACTIVE' && existingPayload?.slots.length) return false;

  const events = await prisma.telegramCommunityEvent.findMany({
    where: { chatId: groupChatId, status: 'SCHEDULED', startsAt: { gt: now, lt: end } },
    orderBy: { startsAt: 'asc' },
    take: MAX_DAILY_VC_SLOTS
  });
  if (!events.length) return false;

  const rootsValue = baseValues.telegramCommunityVcTopicRoots || '';
  const libraryHash = topicLibraryHash(rootsValue);
  let payload =
    existing?.state === 'PREPARING' &&
    existingPayload?.slots.length &&
    existingPayload.topicLibraryHash === libraryHash
      ? existingPayload
      : null;

  if (!payload) {
    const history = await recentTopicPlans();
    const usedTopics = history.flatMap(
      (entry) => planPayload(entry.payload)?.slots.map((slot) => slot.topic) || []
    );
    const topics = selectUnusedVcTopics({
      rootsValue,
      usedTopics,
      count: events.length,
      dateKey
    });
    if (topics.length < events.length) {
      await notifyTopicLibraryNeedsAttention({
        stateChatId,
        existingPayload,
        staffChatId,
        groupChatId,
        dateKey,
        available: topics.length,
        required: events.length,
        libraryHash,
        now
      });
      return false;
    }

    payload = {
      version: 1,
      dateKey,
      groupChatId,
      staffChatId,
      slots: events.map((event, index) => ({
        eventId: event.id,
        startsAt: event.startsAt.toISOString(),
        topic: topics[index]
      })),
      topicLibraryHash: libraryHash
    };
    if (!existing) {
      await prisma.telegramCommunityState.create({
        data: {
          bot: VC_TOPIC_PLAN_STATE,
          chatId: stateChatId,
          state: 'PREPARING',
          payload: payload as unknown as Prisma.InputJsonValue,
          expiresAt: new Date(now.getTime() + PLAN_RETENTION_DAYS * 24 * 60 * 60 * 1000)
        }
      });
    } else {
      await prisma.telegramCommunityState.update({
        where: stateKey,
        data: { state: 'PREPARING', payload: payload as unknown as Prisma.InputJsonValue }
      });
    }
  }

  if (!payload.publicMessageId) {
    const publicBoard = vcTopicPublicBoard(payload, {});
    const publicMessage = await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      groupChatId,
      publicBoard.text,
      { reply_markup: publicBoard.keyboard }
    );
    payload.publicMessageId = publicMessage.message_id;
    await prisma.telegramCommunityState.update({
      where: stateKey,
      data: { payload: payload as unknown as Prisma.InputJsonValue }
    });
  }

  if (!payload.staffMessageId) {
    const staffBoard = vcTopicStaffBoard(payload);
    const staffMessage = await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      staffChatId,
      staffBoard.text,
      { reply_markup: staffBoard.keyboard }
    );
    payload.staffMessageId = staffMessage.message_id;
  }
  await prisma.telegramCommunityState.update({
    where: stateKey,
    data: { state: 'ACTIVE', payload: payload as unknown as Prisma.InputJsonValue }
  });
  return true;
}

async function findPlanByEventId(eventId: string) {
  const states = await prisma.telegramCommunityState.findMany({
    where: { bot: VC_TOPIC_PLAN_STATE, state: 'ACTIVE' },
    orderBy: { updatedAt: 'desc' },
    take: 30
  });
  return (
    states
      .map((state) => ({ state, payload: planPayload(state.payload) }))
      .find((entry) => entry.payload?.slots.some((slot) => slot.eventId === eventId)) || null
  );
}

const planLocks = new Map<string, Promise<void>>();

async function withPlanLock<T>(key: string, work: () => Promise<T>) {
  const prior = planLocks.get(key) || Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = prior.catch(() => undefined).then(() => gate);
  planLocks.set(key, queued);
  await prior.catch(() => undefined);
  try {
    return await work();
  } finally {
    release();
    if (planLocks.get(key) === queued) planLocks.delete(key);
  }
}

function descriptionWithTopic(
  description: string | null,
  topic: string,
  person: CommunityTelegramUser
) {
  const base = (description || '')
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:host|topic)\s*:/i.test(line))
    .join('\n')
    .trim();
  return [`Topic: ${topic}`, `Host: ${telegramPersonName(person)}`, base]
    .filter(Boolean)
    .join('\n');
}

async function claimVcTopic(
  update: CommunityTelegramUpdate,
  eventId: string
): Promise<VcTopicCallbackResult> {
  const callback = update.callback_query!;
  const located = await findPlanByEventId(eventId);
  if (!located?.payload) return 'expired';
  if (String(callback.message?.chat.id) !== located.payload.staffChatId) return 'denied';
  const values = await groupHelpConfig(located.payload.groupChatId);
  const permissionMessage = messageForGroupHelpTarget(
    { ...callback.message!, from: callback.from, text: '/info' },
    located.payload.groupChatId
  );
  if (!(await canUseGroupHelpCommand(permissionMessage, values, '/info', 'HELPER'))) {
    return 'denied';
  }

  return withPlanLock(located.state.id, async () => {
    const current = await prisma.telegramCommunityState.findUnique({
      where: { id: located.state.id }
    });
    const plan = planPayload(current?.payload);
    const slot = plan?.slots.find((candidate) => candidate.eventId === eventId);
    if (!plan || !slot) return 'expired';
    if (slot.assignment) return 'already-claimed';

    slot.assignment = {
      telegramUserId: String(callback.from.id),
      name: telegramPersonName(callback.from),
      username: callback.from.username,
      selectedAt: new Date().toISOString()
    };
    const event = await prisma.telegramCommunityEvent.findUnique({ where: { id: eventId } });
    if (!event || event.status !== 'SCHEDULED') return 'expired';
    await prisma.$transaction([
      prisma.telegramCommunityState.update({
        where: { id: current!.id },
        data: { payload: plan as unknown as Prisma.InputJsonValue }
      }),
      prisma.telegramCommunityEvent.update({
        where: { id: eventId },
        data: { description: descriptionWithTopic(event.description, slot.topic, callback.from) }
      })
    ]);
    await refreshPlanMessages(plan);

    const confirmation = [
      'VC topic selected',
      '',
      `Admin: ${telegramPersonLogLabel(callback.from)}`,
      `Time: ${formatIndiaTime(slot.startsAt)} IST`,
      `Topic: ${slot.topic}`,
      '',
      'Please prepare a welcoming opening question and avoid diagnosis or medical advice.'
    ].join('\n');
    await sendCommunityMessage(GROUP_HELP_BOT_SLUG, plan.staffChatId, confirmation);
    await sendCommunityMessage(GROUP_HELP_BOT_SLUG, callback.from.id, confirmation).catch(
      () => null
    );
    return 'claimed';
  });
}

async function rsvpForVcTopic(eventId: string, user: CommunityTelegramUser) {
  const located = await findPlanByEventId(eventId);
  if (!located?.payload) return 'expired' as const;
  const event = await prisma.telegramCommunityEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'SCHEDULED') return 'expired' as const;
  await prisma.telegramCommunityEventRsvp.upsert({
    where: { eventId_telegramUserId: { eventId, telegramUserId: String(user.id) } },
    create: {
      eventId,
      telegramUserId: String(user.id),
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name
    },
    update: {
      status: 'GOING',
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name
    }
  });
  await refreshPlanMessages(located.payload);
  return 'rsvp' as const;
}

export async function handleTelegramVcTopicCallback(
  update: CommunityTelegramUpdate
): Promise<VcTopicCallbackResult | false> {
  const callback = update.callback_query;
  if (!callback?.message || !callback.data) return false;
  if (callback.data.startsWith('vc_claim:')) {
    return claimVcTopic(update, callback.data.slice('vc_claim:'.length));
  }
  if (callback.data.startsWith('vc_rsvp:')) {
    return rsvpForVcTopic(callback.data.slice('vc_rsvp:'.length), callback.from);
  }
  return false;
}
