import { Router } from 'express';
import { Prisma, Role, TelegramBotKind } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';
import { parseMultipartForm } from '../../utils/multipart.js';
import { saveHopeHubMedia } from '../../services/hope-hub-media-storage.js';
import {
  getTelegramWebhookInfo,
  setTelegramCommands,
  setTelegramWebsiteMenuButton,
  setTelegramWebhook,
  telegramBotStatus
} from '../../services/telegram-bots.client.js';
import { roleByKind } from '../../services/telegram-bots.config.js';
import { telegramBotKindFromSlug } from '../../services/telegram-bots.menus.js';
import {
  communityBotFromSlug,
  communityBotStatus,
  getCommunityWebhookInfo,
  setupCommunityBot
} from '../../services/telegram-community-bots.js';
import type { CommunityBotSlug } from '../../services/telegram-community-bots.types.js';
import { apiUrl } from '../../services/telegram-bots.ui.js';
import { escapeHtml } from '../../services/telegram-bots.helpers.js';
import {
  callGroupHelpTelegramApi,
  getGroupHelpWebhookInfo,
  groupHelpBotStatus,
  groupHelpBotToken
} from '../../services/telegram-group-help.client.js';
import {
  GROUP_HELP_ACTIONS,
  GROUP_HELP_CAPABILITY_GROUPS,
  GROUP_HELP_CONFIG_DEFAULTS,
  GROUP_HELP_CONFIG_KEYS,
  GROUP_HELP_CONFIG_META
} from '../../constants/group-help-config.constants.js';
import { markGroupHelpConfigOverrides } from '../../services/telegram-group-help-defaults.js';
import {
  TELEGRAM_BOT_CONTROL_DEFAULTS,
  TELEGRAM_BOT_CONTROL_KEYS,
  TELEGRAM_BOT_CONTROL_META
} from '../../constants/telegram-bot-controls.constants.js';
import {
  clearTelegramBotControlsCache,
  getTelegramBotControls
} from '../../services/telegram-bot-controls.js';
import { markSiteConfigOverrides } from '../../services/site-config.service.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from '../../services/telegram-community-bots.client.js';
import { configuredUrlKeyboard } from '../../services/telegram-keyboard-config.js';
import {
  applyTelegramCommunityAnnouncementPin,
  announceTelegramCommunityEvent,
  deleteTelegramCommunityEvent,
  refreshTelegramCommunityEventAnnouncement,
  retryTelegramCampaignDelivery
} from '../../services/telegram-community-campaigns.js';
import {
  refreshTelegramContentSource,
  reviewTelegramContentItem,
  validPublicHttpsUrl
} from '../../services/telegram-content-network.js';
import { approveGroupHelpMemberFirstMessage } from '../../services/telegram-group-help.approval.js';
import { sendGroupHelpActivityLog } from '../../services/telegram-group-help.actions.js';
import {
  COMMUNITY_BOT_SLUGS,
  GROUP_HELP_BOT_DISPLAY_NAME,
  GROUP_HELP_BOT_SLUG
} from '../../constants/telegram-community-bot.constants.js';
import {
  GROUP_HELP_COMMAND_DEFINITIONS,
  GROUP_HELP_STAFF_PERMISSION_GROUPS
} from '../../services/telegram-group-help.commands.js';
import {
  GroupHelpStaffPermissionError,
  saveGroupHelpStaffPermissions
} from '../../services/telegram-group-help.staff-permissions.js';
import { replaceTelegramCommunityRoleAssignment } from '../../services/telegram-group-help.role-assignments.js';
import {
  getTelegramCommunityGroupPolicy,
  saveTelegramCommunityGroupPolicy
} from '../../services/telegram-community-group-policy.js';

const setupSchema = z.object({
  dropPendingUpdates: z.boolean().optional(),
  publicApiUrl: z.string().url().optional()
});

const groupHelpSaveSchema = z.object({
  scope: z.enum(['main', 'off-topic']).optional(),
  entries: z
    .array(
      z.object({
        key: z.string(),
        value: z.string()
      })
    )
    .min(1)
    .max(GROUP_HELP_CONFIG_KEYS.length)
});

const groupHelpRevisionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  entries: z
    .array(
      z.object({
        key: z.string(),
        value: z.string()
      })
    )
    .min(1)
    .max(GROUP_HELP_CONFIG_KEYS.length)
});

const groupHelpRoleSchema = z
  .object({
    chatId: z.string().trim().min(1).max(80).optional(),
    telegramUserId: z.string().trim().regex(/^\d+$/, 'Use a numeric Telegram user ID.').max(32),
    role: z.enum(['HELPER', 'MODERATOR']).optional(),
    customRoleId: z.string().trim().min(1).max(64).optional()
  })
  .refine((value) => Boolean(value.role) !== Boolean(value.customRoleId), {
    message: 'Choose either a standard role or one custom role.'
  });

const groupHelpCustomRoleSchema = z.object({
  chatId: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(2).max(40),
  permissions: z
    .array(
      z
        .string()
        .trim()
        .regex(/^\/[a-z]+$/i)
    )
    .min(1)
    .max(24)
});

const groupHelpStaffPermissionsSchema = z.object({
  telegramUserId: z.string().trim().regex(/^\d+$/).max(32),
  permissions: z
    .array(
      z
        .string()
        .trim()
        .regex(/^\/[a-z]+$/i)
    )
    .max(64),
  fullAdmin: z.boolean().optional()
});

const groupHelpModerationResolutionSchema = z.object({
  action: z.enum(['APPROVE', 'NO_ACTION', 'DELETE', 'MUTE', 'KICK', 'BAN'])
});

const botControlsSaveSchema = z.object({
  entries: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .min(1)
    .max(TELEGRAM_BOT_CONTROL_KEYS.length)
});

const botControlsPreviewSchema = z.object({
  group: z.enum(['Shared links', 'Confession bot', 'Contact bot', 'Rules bot']),
  entries: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .max(TELEGRAM_BOT_CONTROL_KEYS.length)
});

const OPTIONAL_BOT_TEXT_CONTROLS = new Set([
  'telegramConfessionMenuLinks',
  'telegramContactMenuLinks',
  'telegramRulesMenuLinks'
]);

const BOT_LINK_LIST_CONTROLS = new Set([
  'telegramConfessionMenuLinks',
  'telegramContactMenuLinks',
  'telegramRulesMenuLinks'
]);

const TELEGRAM_CHAT_ID_CONTROLS = new Set([
  'telegramConfessionAdminChatId',
  'telegramConfessionApprovalGroupId',
  'telegramConfessionChannelId',
  'telegramContactSupportGroupId'
]);

function validBotLinkList(value: string) {
  if (!value) return true;
  const lines = value.split(/\r?\n/).filter((line) => line.trim());
  return (
    lines.length <= 8 &&
    lines.every((line) => {
      const [label, url, style = 'primary'] = line.split('|').map((part) => part.trim());
      return (
        Boolean(label) &&
        /^https:\/\//i.test(url || '') &&
        ['primary', 'success', 'danger'].includes(style)
      );
    })
  );
}

const groupHelpSendSchema = z.object({
  message: z.string().trim().min(1).max(4096),
  imageUrl: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().url().optional()
  ),
  pin: z.boolean().optional()
});

const groupHelpApplySchema = z.object({
  actionId: z.string().trim().min(1).max(80),
  scope: z.enum(['main', 'off-topic']).optional()
});

const campaignItemSchema = z
  .object({
    kind: z.enum(['TEXT', 'IMAGE_QUOTE', 'POLL', 'WELLBEING_POLL', 'SUMMARY']),
    contentCategory: z.string().trim().max(80).optional(),
    sourceUrl: z.preprocess(
      (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
      z.string().trim().url().optional()
    ),
    text: z.string().trim().max(4096).optional(),
    imageUrl: z.preprocess(
      (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
      z.string().trim().url().optional()
    ),
    buttons: z
      .array(
        z.object({
          text: z.string().trim().min(1).max(64),
          url: z.string().trim().url(),
          style: z.enum(['primary', 'success', 'danger']).optional()
        })
      )
      .max(8)
      .optional(),
    pollQuestion: z.string().trim().max(300).optional(),
    pollOptions: z.array(z.string().trim().min(1).max(100)).min(2).max(12).optional(),
    pollAnonymous: z.boolean().default(true),
    pollMultiple: z.boolean().default(false),
    pollQuiz: z.boolean().default(false),
    correctOptionIds: z.array(z.number().int().min(0)).max(1).optional(),
    pollExplanation: z.string().trim().max(200).optional(),
    closeAfterMinutes: z.number().int().min(1).max(43_800).optional(),
    messageThreadId: z.number().int().positive().optional(),
    followUpOptionIds: z.array(z.number().int().min(0).max(11)).max(12).optional(),
    followUpMessage: z.string().trim().max(1200).optional()
  })
  .superRefine((item, context) => {
    if (['TEXT', 'IMAGE_QUOTE', 'SUMMARY'].includes(item.kind) && !item.text) {
      context.addIssue({ code: 'custom', path: ['text'], message: 'Message text is required.' });
    }
    if (item.kind === 'IMAGE_QUOTE' && !item.imageUrl) {
      context.addIssue({
        code: 'custom',
        path: ['imageUrl'],
        message: 'An image quote requires uploaded media or an image URL.'
      });
    }
    if (
      ['POLL', 'WELLBEING_POLL'].includes(item.kind) &&
      (!item.pollQuestion || !item.pollOptions?.length)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['pollQuestion'],
        message: 'Poll question and options are required.'
      });
    }
    if (item.pollQuiz && !item.correctOptionIds?.length) {
      context.addIssue({
        code: 'custom',
        path: ['correctOptionIds'],
        message: 'Choose at least one correct quiz answer.'
      });
    }
    if (item.pollQuiz && item.pollMultiple) {
      context.addIssue({
        code: 'custom',
        path: ['pollMultiple'],
        message: 'A Telegram quiz can have one correct answer only.'
      });
    }
    if (item.followUpOptionIds?.length && item.pollAnonymous) {
      context.addIssue({
        code: 'custom',
        path: ['pollAnonymous'],
        message: 'Private follow-up requires a non-anonymous poll.'
      });
    }
  });

const campaignSaveSchema = z.object({
  name: z.string().trim().min(2).max(120),
  chatId: z.string().trim().max(80).optional(),
  timezone: z.string().trim().min(1).max(80).default('Asia/Kolkata'),
  intervalMinutes: z.number().int().min(5).max(43_800),
  repeat: z.boolean().default(true),
  isActive: z.boolean().default(false),
  startsAt: z.coerce.date().optional(),
  items: z.array(campaignItemSchema).min(1).max(250)
});

const campaignToggleSchema = z.object({ isActive: z.boolean() });

const contentNetworkChannelSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,48}$/),
  name: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(80),
  chatId: z
    .string()
    .trim()
    .regex(/^(?:-?\d+|@[A-Za-z][A-Za-z0-9_]{4,31})$/),
  isActive: z.boolean().default(false),
  requireApproval: z.boolean().default(true),
  minimumPostGapMinutes: z.number().int().min(15).max(1_440).default(120)
});

const contentNetworkSourceSchema = z.object({
  channelId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2).max(120),
  feedUrl: z.string().trim().url().max(1_500),
  attribution: z.string().trim().min(2).max(160),
  isActive: z.boolean().default(true),
  autoApprove: z.boolean().default(false),
  fetchIntervalMinutes: z.number().int().min(30).max(10_080).default(180)
});

const contentNetworkReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  scheduledFor: z.coerce.date().optional()
});

const communityEventSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1200).optional(),
  joinUrl: z.string().trim().url(),
  startsAt: z.coerce.date(),
  reminderMinutes: z.number().int().min(5).max(10_080).default(30),
  chatId: z.string().trim().max(80).optional(),
  recurrence: z.enum(['ONCE', 'DAILY', 'WEEKDAYS', 'WEEKLY']).default('ONCE'),
  occurrences: z.number().int().min(1).max(90).default(1)
});

const GROUP_HELP_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime'
]);

type WebhookSnapshot =
  | {
      ok: true;
      result: unknown;
    }
  | {
      ok: false;
      error: string;
    };

async function safeWebhookInfo(kind: TelegramBotKind): Promise<WebhookSnapshot | null> {
  const configured = telegramBotStatus().find((bot) => bot.kind === kind)?.configured;
  if (!configured) return null;

  try {
    return { ok: true, result: await getTelegramWebhookInfo(kind) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not read Telegram webhook info.'
    };
  }
}

async function safeCommunityWebhookInfo(slug: CommunityBotSlug): Promise<WebhookSnapshot | null> {
  const configured = communityBotStatus().find((bot) => bot.slug === slug)?.configured;
  if (!configured) return null;
  try {
    return { ok: true, result: await getCommunityWebhookInfo(slug) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not read Telegram webhook info.'
    };
  }
}

async function safeGroupHelpWebhookInfo(): Promise<WebhookSnapshot | null> {
  if (!groupHelpBotToken()) return null;
  try {
    return { ok: true, result: await getGroupHelpWebhookInfo() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not read Group Help webhook info.'
    };
  }
}

function linkedName(session: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}) {
  const name = [session.firstName, session.lastName].filter(Boolean).join(' ').trim();
  return name || (session.username ? `@${session.username}` : 'Telegram user');
}

type ManagedGroupHelpScope = 'main' | 'off-topic';

async function groupHelpConfigMap(chatId?: string) {
  const rows = await prisma.siteConfig.findMany({
    where: { key: { in: GROUP_HELP_CONFIG_KEYS } }
  });
  const policy = chatId ? await getTelegramCommunityGroupPolicy(chatId) : {};
  const values: Record<string, string> = {
    ...GROUP_HELP_CONFIG_DEFAULTS,
    ...Object.fromEntries(rows.map((row) => [row.key, row.value])),
    ...policy
  };
  if (values.telegramGroupHelpBotUsername?.replace(/^@/, '').toLowerCase() === 'hopehubaibot') {
    values.telegramGroupHelpBotUsername = 'Hopehubbot';
  }
  return values;
}

function managedGroupHelpTarget(values: Record<string, string>, scope: ManagedGroupHelpScope) {
  const offTopic = scope === 'off-topic';
  return {
    scope,
    chatId:
      (offTopic
        ? values.telegramGroupHelpOffTopicGroupChatId
        : values.telegramGroupHelpGroupChatId
      )?.trim() || '',
    label: offTopic
      ? 'HopeHub Chit-Chat'
      : values.telegramGroupHelpGroupTitle || 'Main support group'
  };
}

function editableGroupHelpConfigKeys(scope: ManagedGroupHelpScope) {
  return scope === 'main'
    ? GROUP_HELP_CONFIG_KEYS
    : GROUP_HELP_CONFIG_KEYS.filter((key) => GROUP_HELP_CONFIG_META[key].section !== 'connection');
}

function serializedGroupHelpConfig(values: Record<string, string>, scope: ManagedGroupHelpScope) {
  return editableGroupHelpConfigKeys(scope).map((key) => ({
    ...GROUP_HELP_CONFIG_META[key],
    value: values[key] ?? ''
  }));
}

type GroupHelpConfigEntryInput = { key: string; value: string };

function validateGroupHelpConfigEntries(entries: GroupHelpConfigEntryInput[]) {
  const updates: Array<{
    key: string;
    value: string;
    meta: (typeof GROUP_HELP_CONFIG_META)[string];
  }> = [];
  for (const entry of entries) {
    const meta = GROUP_HELP_CONFIG_META[entry.key];
    if (!meta) throw new Error(`Unknown Group Help config key: ${entry.key}`);
    const value = entry.value.trim();
    if (value.length > meta.maxLength) {
      throw new Error(`${meta.label} is too long. Maximum ${meta.maxLength} characters.`);
    }
    if (meta.type === 'select' && meta.options && !meta.options.includes(value)) {
      throw new Error(`${meta.label} has an unsupported option.`);
    }
    if (meta.type === 'number' && value && !/^\d+$/.test(value)) {
      throw new Error(`${meta.label} must be a whole number.`);
    }
    if (
      ['telegramGroupHelpNightStart', 'telegramGroupHelpNightEnd'].includes(entry.key) &&
      value &&
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
    ) {
      throw new Error(`${meta.label} must use HH:MM format.`);
    }
    if (entry.key === 'telegramGroupHelpAntiFloodLimit' && value && !/^\d+\s+\d+$/.test(value)) {
      throw new Error('Anti-flood threshold must use “count seconds”.');
    }
    updates.push({ key: entry.key, value, meta });
  }
  return updates;
}

function revisionEntries(metadata: Prisma.JsonValue | null): GroupHelpConfigEntryInput[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const raw = (metadata as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is GroupHelpConfigEntryInput =>
      Boolean(entry) &&
      typeof entry === 'object' &&
      typeof (entry as { key?: unknown }).key === 'string' &&
      typeof (entry as { value?: unknown }).value === 'string' &&
      GROUP_HELP_CONFIG_KEYS.includes((entry as { key: string }).key as any)
  );
}

async function persistGroupHelpConfig(
  entries: GroupHelpConfigEntryInput[],
  actor: { id: string; role: Role },
  action: 'telegram_group_help.config_update' | 'telegram_group_help.config_publish',
  summary: string,
  targetId = 'config'
) {
  const updates = validateGroupHelpConfigEntries(entries);
  const current = await groupHelpConfigMap();
  const saved = await prisma.$transaction(
    updates.map(({ key, value, meta }) =>
      prisma.siteConfig.upsert({
        where: { key },
        create: { key, value, label: meta.label },
        update: { value, label: meta.label }
      })
    )
  );
  await markGroupHelpConfigOverrides(updates.map(({ key, value }) => ({ key, value })));
  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    targetType: 'telegram_group_help',
    targetId,
    summary,
    metadata: {
      entries: updates.map(({ key, value }) => ({ key, value })),
      changes: updates.map(({ key, value }) => ({ key, before: current[key] ?? '', after: value }))
    }
  });
  return saved;
}

async function persistScopedGroupHelpConfig(
  scope: ManagedGroupHelpScope,
  entries: GroupHelpConfigEntryInput[],
  actor: { id: string; role: Role }
) {
  if (scope === 'main') {
    return persistGroupHelpConfig(
      entries,
      actor,
      'telegram_group_help.config_update',
      `Updated ${entries.length} main-group config item(s).`,
      'config:main'
    );
  }

  const globalValues = await groupHelpConfigMap();
  const target = managedGroupHelpTarget(globalValues, scope);
  if (!target.chatId) throw new Error('HopeHub Chit-Chat group ID is not configured.');

  const allowedKeys = new Set(editableGroupHelpConfigKeys(scope));
  const updates = validateGroupHelpConfigEntries(entries).filter(({ key }) => allowedKeys.has(key));
  if (!updates.length) throw new Error('No editable Chit-Chat settings were provided.');

  const existing = await getTelegramCommunityGroupPolicy(target.chatId);
  await saveTelegramCommunityGroupPolicy(target.chatId, {
    ...existing,
    ...Object.fromEntries(updates.map(({ key, value }) => [key, value]))
  });
  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'telegram_group_help.config_update',
    targetType: 'telegram_group_help',
    targetId: 'config:off-topic',
    summary: `Updated ${updates.length} HopeHub Chit-Chat config item(s).`,
    metadata: {
      scope,
      chatId: target.chatId,
      entries: updates.map(({ key, value }) => ({ key, value })),
      changes: updates.map(({ key, value }) => ({ key, before: existing[key] ?? '', after: value }))
    }
  });
}

async function groupHelpConnectionHealth(values: Record<string, string>) {
  const requiredPermissions = [
    'can_delete_messages',
    'can_restrict_members',
    'can_promote_members',
    'can_pin_messages',
    'can_manage_video_chats'
  ] as const;
  try {
    const bot = await callCommunityTelegramApi<{
      id: number;
      username?: string;
      first_name?: string;
    }>(GROUP_HELP_BOT_SLUG, 'getMe', {});
    const groups = await Promise.all(
      [
        ['main', values.telegramGroupHelpGroupChatId],
        ['off-topic', values.telegramGroupHelpOffTopicGroupChatId],
        ['log', values.telegramGroupHelpLogChannelId],
        ['staff', values.telegramGroupHelpStaffGroupId]
      ].map(async ([kind, chatId]) => {
        const id = chatId?.trim();
        if (!id) return { kind, configured: false };
        try {
          const [chat, memberCount, membership] = await Promise.all([
            callCommunityTelegramApi<{ title?: string; username?: string; type?: string }>(
              GROUP_HELP_BOT_SLUG,
              'getChat',
              { chat_id: id }
            ),
            callCommunityTelegramApi<number>(GROUP_HELP_BOT_SLUG, 'getChatMemberCount', {
              chat_id: id
            }),
            callCommunityTelegramApi<Record<string, unknown>>(
              GROUP_HELP_BOT_SLUG,
              'getChatMember',
              {
                chat_id: id,
                user_id: bot.id
              }
            )
          ]);
          return {
            kind,
            configured: true,
            reachable: true,
            chatId: id,
            title: chat.title || chat.username || id,
            type: chat.type || null,
            memberCount,
            membership,
            missingPermissions:
              membership.status === 'creator'
                ? []
                : requiredPermissions.filter((permission) => membership[permission] !== true)
          };
        } catch (error) {
          return {
            kind,
            configured: true,
            reachable: false,
            chatId: id,
            error: error instanceof Error ? error.message : 'Telegram group check failed.'
          };
        }
      })
    );
    return {
      bot: { id: bot.id, username: bot.username || null, name: bot.first_name || null },
      groups
    };
  } catch (error) {
    return {
      bot: null,
      groups: [],
      error: error instanceof Error ? error.message : 'Telegram bot check failed.'
    };
  }
}

function renderGroupHelpCommand(
  action: (typeof GROUP_HELP_ACTIONS)[number],
  values: Record<string, string>
) {
  const template = values[action.templateKey] || '{message}';
  const raw = (values[action.valueKey] || '').trim();
  const imageUrl = action.imageUrlKey ? (values[action.imageUrlKey] || '').trim() : '';
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
  const command = template
    .replaceAll('{message}', raw)
    .replaceAll('{imageUrl}', imageUrl)
    .replaceAll('{value}', raw)
    .replaceAll('{lines}', lines)
    .trim();
  return {
    command: imageUrl && !template.includes('{imageUrl}') ? `${command}\n${imageUrl}` : command,
    raw,
    imageUrl
  };
}

async function sendGroupHelpPost(input: {
  message: string;
  imageUrl?: string;
  pin?: boolean;
  chatId?: string;
}) {
  const globalValues = await groupHelpConfigMap();
  const chatId = input.chatId?.trim() || globalValues.telegramGroupHelpGroupChatId?.trim();
  if (!groupHelpBotToken()) throw new Error('TELEGRAM_HOPEHUBBOT_TOKEN is not configured.');
  if (!chatId) throw new Error('Telegram group chat ID is not configured.');
  const values = await groupHelpConfigMap(chatId);
  const messageThreadId = Number(values.telegramCommunityDefaultTopicId || 0) || undefined;

  const media = input.imageUrl ? groupHelpMediaPayload(input.imageUrl) : null;
  const sent = media
    ? await callGroupHelpTelegramApi<{ message_id: number }>(media.method, {
        chat_id: chatId,
        ...media.payload,
        caption:
          input.message.length <= 1024 ? input.message : `${input.message.slice(0, 1021)}...`,
        ...(messageThreadId ? { message_thread_id: messageThreadId } : {})
      })
    : await callGroupHelpTelegramApi<{ message_id: number }>('sendMessage', {
        chat_id: chatId,
        text: input.message,
        disable_web_page_preview: true,
        ...(messageThreadId ? { message_thread_id: messageThreadId } : {})
      });
  await applyTelegramCommunityAnnouncementPin({
    chatId,
    messageId: sent.message_id,
    kind: 'announcement',
    force: input.pin === true
  });
  return { chatId, sent, pinned: input.pin === true };
}

function groupHelpMediaPayload(url: string) {
  const path = url.split(/[?#]/, 1)[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(path)) {
    return { method: 'sendVideo', payload: { video: url } };
  }
  if (/\.gif$/.test(path)) {
    return { method: 'sendAnimation', payload: { animation: url } };
  }
  return { method: 'sendPhoto', payload: { photo: url } };
}

function campaignItemData(
  item: z.infer<typeof campaignItemSchema>,
  sortOrder: number
): Prisma.TelegramCampaignItemCreateWithoutCampaignInput {
  return {
    sortOrder,
    kind: item.kind,
    contentCategory: item.contentCategory,
    sourceUrl: item.sourceUrl,
    text: item.text,
    imageUrl: item.imageUrl,
    buttons: item.buttons as Prisma.InputJsonValue | undefined,
    pollQuestion: item.pollQuestion,
    pollOptions: item.pollOptions as Prisma.InputJsonValue | undefined,
    pollAnonymous: item.pollAnonymous,
    pollMultiple: item.pollMultiple,
    pollQuiz: item.pollQuiz,
    correctOptionIds: item.correctOptionIds as Prisma.InputJsonValue | undefined,
    pollExplanation: item.pollExplanation,
    closeAfterMinutes: item.closeAfterMinutes,
    messageThreadId: item.messageThreadId,
    followUpOptionIds: item.followUpOptionIds as Prisma.InputJsonValue | undefined,
    followUpMessage: item.followUpMessage
  };
}

export function registerAdminTelegramBotRoutes(router: Router) {
  router.get(
    '/admin/telegram-bots/controls',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const values = await getTelegramBotControls();
      res.json({
        controls: TELEGRAM_BOT_CONTROL_KEYS.map((key) => ({
          key,
          ...TELEGRAM_BOT_CONTROL_META[key],
          value: values[key] ?? TELEGRAM_BOT_CONTROL_DEFAULTS[key]
        }))
      });
    })
  );

  router.patch(
    '/admin/telegram-bots/controls',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = botControlsSaveSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: 'Invalid bot control payload.' });

      const updates: Array<{
        key: (typeof TELEGRAM_BOT_CONTROL_KEYS)[number];
        value: string;
        label: string;
      }> = [];
      for (const entry of parsed.data.entries) {
        if (!TELEGRAM_BOT_CONTROL_KEYS.includes(entry.key as any)) {
          return res.status(400).json({ message: `Unknown bot control: ${entry.key}` });
        }
        const key = entry.key as (typeof TELEGRAM_BOT_CONTROL_KEYS)[number];
        const meta = TELEGRAM_BOT_CONTROL_META[key];
        const value = entry.value.trim();
        if (value.length > meta.maxLength) {
          return res.status(400).json({ message: `${meta.label} is too long.` });
        }
        if (meta.type === 'boolean' && !['true', 'false'].includes(value)) {
          return res.status(400).json({ message: `${meta.label} must be enabled or disabled.` });
        }
        if (meta.type === 'textarea' && value.length < 5 && !OPTIONAL_BOT_TEXT_CONTROLS.has(key)) {
          return res
            .status(400)
            .json({ message: `${meta.label} must contain at least 5 characters.` });
        }
        if (BOT_LINK_LIST_CONTROLS.has(key) && !validBotLinkList(value)) {
          return res.status(400).json({
            message: `${meta.label} must use “Label | https://link | primary, success, or danger”, with one button per line.`
          });
        }
        if (key === 'telegramCampaignContactUrl' && value && !/^https:\/\//i.test(value)) {
          return res.status(400).json({ message: `${meta.label} must be an HTTPS link.` });
        }
        if (
          TELEGRAM_CHAT_ID_CONTROLS.has(key) &&
          value &&
          !/^(?:-?\d+|@[A-Za-z][A-Za-z0-9_]{4,31})$/.test(value)
        ) {
          return res.status(400).json({
            message: `${meta.label} must be a numeric Telegram chat ID or an @username.`
          });
        }
        if (meta.type === 'number') {
          if (!/^\d+$/.test(value)) {
            return res.status(400).json({ message: `${meta.label} must be a whole number.` });
          }
          const number = Number(value);
          if ((meta.min != null && number < meta.min) || (meta.max != null && number > meta.max)) {
            return res.status(400).json({
              message: `${meta.label} must be between ${meta.min} and ${meta.max}.`
            });
          }
        }
        updates.push({ key, value, label: meta.label });
      }

      const current = await getTelegramBotControls();
      const merged = {
        ...current,
        ...Object.fromEntries(updates.map((item) => [item.key, item.value]))
      };
      if (
        Number(merged.telegramConfessionMinCharacters) >
        Number(merged.telegramConfessionMaxCharacters)
      ) {
        return res.status(400).json({ message: 'Confession minimum cannot exceed its maximum.' });
      }
      if (
        Number(merged.telegramContactMinCharacters) > Number(merged.telegramContactMaxCharacters)
      ) {
        return res.status(400).json({ message: 'Contact minimum cannot exceed its maximum.' });
      }

      await prisma.$transaction(
        updates.map((item) =>
          prisma.siteConfig.upsert({
            where: { key: item.key },
            create: { key: item.key, value: item.value, label: item.label },
            update: { value: item.value, label: item.label }
          })
        )
      );
      await markSiteConfigOverrides(updates.map(({ key, value }) => ({ key, value })));
      clearTelegramBotControlsCache();
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_bots.controls_update',
        targetType: 'telegram_bots',
        targetId: 'controls',
        summary: `Updated ${updates.length} Telegram bot control(s).`,
        metadata: {
          changes: updates.map((item) => ({
            key: item.key,
            before: current[item.key],
            after: item.value
          }))
        }
      });

      const values = await getTelegramBotControls();
      res.json({
        controls: TELEGRAM_BOT_CONTROL_KEYS.map((key) => ({
          key,
          ...TELEGRAM_BOT_CONTROL_META[key],
          value: values[key]
        }))
      });
    })
  );

  router.post(
    '/admin/telegram-bots/controls/preview',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const parsed = botControlsPreviewSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: 'Invalid preview payload.' });
      const invalidKey = parsed.data.entries.find(
        (entry) => !TELEGRAM_BOT_CONTROL_KEYS.includes(entry.key as any)
      );
      if (invalidKey)
        return res.status(400).json({ message: `Unknown bot control: ${invalidKey.key}` });
      const [stored, groupConfig] = await Promise.all([
        getTelegramBotControls(),
        groupHelpConfigMap()
      ]);
      const controls = {
        ...stored,
        ...Object.fromEntries(parsed.data.entries.map((entry) => [entry.key, entry.value.trim()]))
      };
      const previewGroupId = groupConfig.telegramGroupHelpStaffGroupId?.trim();
      if (!previewGroupId) {
        return res.status(400).json({
          message:
            'Private staff group is not configured. Configure it before sending bot previews.'
        });
      }
      const preview =
        parsed.data.group === 'Confession bot'
          ? {
              text: `🧪 CONFESSION BOT PREVIEW\n\n${controls.telegramConfessionWelcomeText}`,
              keyboard: configuredUrlKeyboard(controls.telegramConfessionMenuLinks)
            }
          : parsed.data.group === 'Contact bot'
            ? {
                text: `🧪 CONTACT BOT PREVIEW\n\n${controls.telegramContactWelcomeText}`,
                keyboard: configuredUrlKeyboard(controls.telegramContactMenuLinks)
              }
            : parsed.data.group === 'Rules bot'
              ? {
                  text: `🧪 RULES BOT PREVIEW\n\n${controls.telegramRulesWelcomeText}\n\n${controls.telegramRulesAboutText}`.slice(
                    0,
                    4096
                  ),
                  keyboard: configuredUrlKeyboard(controls.telegramRulesMenuLinks)
                }
              : {
                  text: `🧪 SHARED LINK PREVIEW\n\nCampaign contact: ${controls.telegramCampaignContactUrl}`,
                  keyboard: configuredUrlKeyboard(
                    `Contact Hope Hub | ${controls.telegramCampaignContactUrl} | success`
                  )
                };
      const message = await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        previewGroupId,
        preview.text,
        {
          reply_markup: preview.keyboard
        }
      );
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_bots.preview_send',
        targetType: 'telegram_bots',
        targetId: parsed.data.group,
        summary: `Sent ${parsed.data.group} preview to the private Telegram staff group.`
      });
      res.json({ ok: true, messageId: message.message_id, previewGroupId });
    })
  );

  router.get(
    '/admin/telegram-bots/controls/history',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const history = await prisma.auditLog.findMany({
        where: { action: 'telegram_bots.controls_update', targetType: 'telegram_bots' },
        select: { id: true, summary: true, metadata: true, createdAt: true, actorId: true },
        orderBy: { createdAt: 'desc' },
        take: 30
      });
      res.json({ history });
    })
  );

  router.post(
    '/admin/telegram-bots/controls/history/:id/restore',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const entry = await prisma.auditLog.findUnique({ where: { id: routeParam(req, 'id') } });
      if (!entry || entry.action !== 'telegram_bots.controls_update')
        return res.status(404).json({ message: 'Configuration version not found.' });
      const metadata = entry.metadata as {
        changes?: Array<{ key?: string; before?: string }>;
      } | null;
      const changes = (metadata?.changes || []).filter(
        (change): change is { key: (typeof TELEGRAM_BOT_CONTROL_KEYS)[number]; before: string } =>
          typeof change.key === 'string' &&
          TELEGRAM_BOT_CONTROL_KEYS.includes(change.key as any) &&
          typeof change.before === 'string'
      );
      if (!changes.length)
        return res.status(400).json({ message: 'This older entry cannot be restored.' });
      await prisma.$transaction(
        changes.map((change) =>
          prisma.siteConfig.upsert({
            where: { key: change.key },
            create: {
              key: change.key,
              value: change.before,
              label: TELEGRAM_BOT_CONTROL_META[change.key].label
            },
            update: { value: change.before }
          })
        )
      );
      await markSiteConfigOverrides(changes.map(({ key, before }) => ({ key, value: before })));
      clearTelegramBotControlsCache();
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_bots.controls_restore',
        targetType: 'telegram_bots',
        targetId: entry.id,
        summary: `Restored ${changes.length} Telegram bot setting(s).`
      });
      res.json({ ok: true, restored: changes.length });
    })
  );

  router.get(
    '/admin/telegram-bots',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const [
        sessions,
        events,
        webhookReceipts,
        communitySubmissionCounts,
        webhookInfos,
        communityWebhookInfos,
        groupHelpWebhookInfo,
        failedDeliveries,
        overdueCampaigns
      ] = await Promise.all([
        prisma.telegramBotSession.findMany({
          select: {
            id: true,
            botKind: true,
            chatId: true,
            telegramUserId: true,
            username: true,
            firstName: true,
            lastName: true,
            linkedUserId: true,
            state: true,
            lastCommand: true,
            createdAt: true,
            updatedAt: true,
            linkedUser: {
              select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
                role: true,
                isActive: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 100
        }),
        prisma.telegramBotEvent.findMany({
          select: {
            id: true,
            sessionId: true,
            botKind: true,
            updateId: true,
            chatId: true,
            eventType: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }),
        prisma.telegramWebhookReceipt.findMany({
          select: {
            bot: true,
            updateId: true,
            status: true,
            error: true,
            attempts: true,
            nextAttemptAt: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' },
          take: 200
        }),
        prisma.telegramCommunitySubmission.groupBy({
          by: ['bot', 'status'],
          _count: { _all: true }
        }),
        Promise.all(
          Object.values(TelegramBotKind).map(
            async (kind) => [kind, await safeWebhookInfo(kind)] as const
          )
        ),
        Promise.all(
          communityBotStatus().map(
            async (bot) => [bot.slug, await safeCommunityWebhookInfo(bot.slug)] as const
          )
        ),
        safeGroupHelpWebhookInfo(),
        prisma.telegramCampaignDelivery.count({ where: { status: 'FAILED' } }),
        prisma.telegramCampaign.count({
          where: {
            isActive: true,
            nextRunAt: { lt: new Date(Date.now() - 5 * 60_000) }
          }
        })
      ]);

      const webhookInfoByKind = Object.fromEntries(webhookInfos);
      const communityWebhookInfoBySlug = Object.fromEntries(communityWebhookInfos);
      const recentGroupHelpCommands = await prisma.telegramGroupHelpCommandAudit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      const receiptSummary = (slug: string) => {
        const rows = webhookReceipts.filter((receipt) => receipt.bot === slug);
        const lastFailure = rows.find((receipt) =>
          ['FAILED', 'DEAD_LETTER'].includes(receipt.status)
        );
        return {
          processedUpdates: rows.filter((receipt) => receipt.status === 'COMPLETED').length,
          failedUpdates: rows.filter((receipt) => receipt.status === 'FAILED').length,
          deadLetterUpdates: rows.filter((receipt) => receipt.status === 'DEAD_LETTER').length,
          lastFailure: lastFailure
            ? {
                error: lastFailure.error,
                attempts: lastFailure.attempts,
                nextAttemptAt: lastFailure.nextAttemptAt,
                updatedAt: lastFailure.updatedAt
              }
            : null
        };
      };
      const accountBots = telegramBotStatus().map((bot) => {
        const botSessions = sessions.filter((session) => session.botKind === bot.kind);
        return {
          ...bot,
          expectedRole: roleByKind[bot.kind],
          webhook: webhookInfoByKind[bot.kind],
          summary: {
            totalSessions: botSessions.length,
            linkedSessions: botSessions.filter((session) => Boolean(session.linkedUserId)).length,
            activeLinkedSessions: botSessions.filter((session) => session.linkedUser?.isActive)
              .length,
            ...receiptSummary(bot.slug)
          }
        };
      });
      const communityBots = communityBotStatus().map((bot) => {
        const submissionCounts = Object.fromEntries(
          communitySubmissionCounts
            .filter((row) => row.bot === bot.slug)
            .map((row) => [row.status, row._count._all])
        );
        return {
          ...bot,
          expectedRole: null,
          webhook: communityWebhookInfoBySlug[bot.slug],
          summary: {
            totalSessions: 0,
            linkedSessions: 0,
            activeLinkedSessions: 0,
            submissions: submissionCounts,
            ...receiptSummary(bot.slug)
          }
        };
      });
      const groupHelpBot = {
        ...groupHelpBotStatus(),
        expectedRole: null,
        webhook: groupHelpWebhookInfo,
        summary: { totalSessions: 0, linkedSessions: 0, activeLinkedSessions: 0 }
      };
      const healthCutoff = Date.now() - 24 * 60 * 60 * 1000;
      const recentFailedWebhookUpdates = webhookReceipts.filter(
        (receipt) =>
          ['FAILED', 'DEAD_LETTER'].includes(receipt.status) &&
          new Date(receipt.updatedAt).getTime() >= healthCutoff
      ).length;
      const failedGroupHelpCommands = recentGroupHelpCommands.filter(
        (entry) => entry.status === 'FAILED' && entry.createdAt.getTime() >= healthCutoff
      ).length;

      res.json({
        bots: [...accountBots, ...communityBots, groupHelpBot],
        sessions: sessions.map((session) => ({
          ...session,
          displayName: linkedName(session)
        })),
        events: events.map((event) => ({
          ...event,
          updateId: event.updateId?.toString() ?? null
        })),
        groupHelpCommandAudits: recentGroupHelpCommands,
        health: {
          failedWebhookUpdates: recentFailedWebhookUpdates,
          failedGroupHelpCommands,
          failedDeliveries,
          overdueCampaigns,
          needsAttention:
            failedDeliveries > 0 ||
            overdueCampaigns > 0 ||
            recentFailedWebhookUpdates > 0 ||
            failedGroupHelpCommands > 0
        }
      });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const scope: ManagedGroupHelpScope = req.query.scope === 'off-topic' ? 'off-topic' : 'main';
      const globalValues = await groupHelpConfigMap();
      const target = managedGroupHelpTarget(globalValues, scope);
      const [values, actionHistory, openCases, groupPolicies] = await Promise.all([
        target.chatId ? groupHelpConfigMap(target.chatId) : Promise.resolve(globalValues),
        prisma.auditLog.findMany({
          where: {
            targetType: 'telegram_group_help',
            action: {
              in: [
                'telegram_group_help.action_apply',
                'telegram_group_help.action_prepare',
                'telegram_group_help.config_draft',
                'telegram_group_help.config_update',
                'telegram_group_help.config_publish'
              ]
            }
          },
          select: {
            id: true,
            action: true,
            targetId: true,
            summary: true,
            actorId: true,
            actorRole: true,
            actor: { select: { id: true, name: true, email: true } },
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }),
        prisma.telegramCommunityModerationCase.count({ where: { status: 'OPEN' } }),
        prisma.telegramCommunityGroupPolicy.findMany({
          select: { chatId: true, lockdownUntil: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 10
        })
      ]);
      const connectionHealth = await groupHelpConnectionHealth(globalValues);
      res.json({
        tokenConfigured: Boolean(groupHelpBotToken()),
        actions: GROUP_HELP_ACTIONS,
        capabilityGroups: GROUP_HELP_CAPABILITY_GROUPS,
        actionHistory,
        operationalHealth: {
          mainGroupConnected: Boolean(globalValues.telegramGroupHelpGroupChatId?.trim()),
          offTopicGroupConnected: Boolean(
            globalValues.telegramGroupHelpOffTopicGroupChatId?.trim()
          ),
          logGroupConnected: Boolean(globalValues.telegramGroupHelpLogChannelId?.trim()),
          staffGroupConnected: Boolean(globalValues.telegramGroupHelpStaffGroupId?.trim()),
          openModerationCases: openCases,
          policies: groupPolicies,
          connectionHealth
        },
        selectedGroup: target,
        managedGroups: [
          managedGroupHelpTarget(globalValues, 'main'),
          managedGroupHelpTarget(globalValues, 'off-topic')
        ],
        config: serializedGroupHelpConfig(values, scope)
      });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/revisions',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const revisions = await prisma.auditLog.findMany({
        where: {
          targetType: 'telegram_group_help',
          action: {
            in: [
              'telegram_group_help.config_draft',
              'telegram_group_help.config_update',
              'telegram_group_help.config_publish'
            ]
          }
        },
        select: {
          id: true,
          action: true,
          summary: true,
          metadata: true,
          actorId: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      });
      res.json({
        revisions: revisions.map((revision) => ({
          ...revision,
          name:
            typeof (revision.metadata as { name?: unknown } | null)?.name === 'string'
              ? (revision.metadata as { name: string }).name
              : revision.summary || 'Configuration version',
          entryCount: revisionEntries(revision.metadata).length
        }))
      });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/revisions',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = groupHelpRevisionSchema.safeParse(req.body ?? {});
      if (!parsed.success)
        return res.status(400).json({ message: 'Enter a draft name and valid settings.' });
      try {
        validateGroupHelpConfigEntries(parsed.data.entries);
      } catch (error) {
        return res
          .status(400)
          .json({ message: error instanceof Error ? error.message : 'Invalid draft.' });
      }
      const revision = await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'telegram_group_help.config_draft',
          targetType: 'telegram_group_help',
          targetId: 'config-draft',
          summary: `Draft: ${parsed.data.name}`,
          metadata: {
            name: parsed.data.name,
            entries: parsed.data.entries
          } as Prisma.InputJsonValue
        },
        select: { id: true, action: true, summary: true, metadata: true, createdAt: true }
      });
      res.status(201).json({ revision, entryCount: parsed.data.entries.length });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/revisions/:id/preview',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const revision = await prisma.auditLog.findUnique({ where: { id: routeParam(req, 'id') } });
      if (!revision || revision.targetType !== 'telegram_group_help') {
        return res.status(404).json({ message: 'Configuration version not found.' });
      }
      const entries = revisionEntries(revision.metadata);
      if (!entries.length)
        return res.status(400).json({ message: 'This version cannot be previewed.' });
      const current = await groupHelpConfigMap();
      const changes = entries
        .map((entry) => ({
          key: entry.key,
          label: GROUP_HELP_CONFIG_META[entry.key].label,
          current: current[entry.key] ?? '',
          next: entry.value
        }))
        .filter((entry) => entry.current !== entry.next);
      res.json({
        revision: { id: revision.id, summary: revision.summary, createdAt: revision.createdAt },
        changes,
        unchanged: entries.length - changes.length
      });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/revisions/:id/publish',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const revision = await prisma.auditLog.findUnique({ where: { id: routeParam(req, 'id') } });
      if (!revision || revision.targetType !== 'telegram_group_help') {
        return res.status(404).json({ message: 'Configuration version not found.' });
      }
      const entries = revisionEntries(revision.metadata);
      if (!entries.length)
        return res.status(400).json({ message: 'This version cannot be published.' });
      try {
        await persistGroupHelpConfig(
          entries,
          { id: req.user!.id, role: req.user!.role },
          'telegram_group_help.config_publish',
          `Published Group Help configuration version “${revision.summary || revision.id}”.`,
          revision.id
        );
      } catch (error) {
        return res
          .status(400)
          .json({ message: error instanceof Error ? error.message : 'Could not publish version.' });
      }
      const values = await groupHelpConfigMap();
      res.json({
        ok: true,
        config: GROUP_HELP_CONFIG_KEYS.map((key) => ({
          ...GROUP_HELP_CONFIG_META[key],
          value: values[key] ?? ''
        }))
      });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/revisions/:id/restore',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const revision = await prisma.auditLog.findUnique({ where: { id: routeParam(req, 'id') } });
      if (!revision || revision.targetType !== 'telegram_group_help') {
        return res.status(404).json({ message: 'Configuration version not found.' });
      }
      const metadata = revision.metadata as {
        changes?: Array<{ key?: string; before?: string }>;
      } | null;
      const entries = (metadata?.changes || [])
        .filter(
          (change): change is { key: string; before: string } =>
            typeof change?.key === 'string' &&
            GROUP_HELP_CONFIG_KEYS.includes(change.key as any) &&
            typeof change.before === 'string'
        )
        .map((change) => ({ key: change.key, value: change.before }));
      if (!entries.length)
        return res.status(400).json({ message: 'This version has no prior values to restore.' });
      try {
        await persistGroupHelpConfig(
          entries,
          { id: req.user!.id, role: req.user!.role },
          'telegram_group_help.config_publish',
          `Restored ${entries.length} Group Help setting(s) from a previous version.`,
          revision.id
        );
      } catch (error) {
        return res
          .status(400)
          .json({ message: error instanceof Error ? error.message : 'Could not restore version.' });
      }
      const values = await groupHelpConfigMap();
      res.json({
        ok: true,
        config: GROUP_HELP_CONFIG_KEYS.map((key) => ({
          ...GROUP_HELP_CONFIG_META[key],
          value: values[key] ?? ''
        }))
      });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/members',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const values = await groupHelpConfigMap();
      const requestedScope = String(req.query.scope || 'main').toLowerCase();
      const scope =
        requestedScope === 'staff'
          ? 'staff'
          : requestedScope === 'off-topic'
            ? 'off-topic'
            : 'main';
      const chatId =
        scope === 'staff'
          ? values.telegramGroupHelpStaffGroupId?.trim() || ''
          : scope === 'off-topic'
            ? values.telegramGroupHelpOffTopicGroupChatId?.trim() || ''
            : values.telegramGroupHelpGroupChatId?.trim() || '';
      if (!chatId) {
        return res.status(400).json({ message: `The ${scope} Telegram group is not configured.` });
      }
      const query = String(req.query.q || '')
        .trim()
        .slice(0, 100);
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 50));
      const where = {
        chatId,
        leftAt: null,
        ...(query
          ? {
              OR: [
                { telegramUserId: { contains: query } },
                { username: { contains: query, mode: 'insensitive' as const } },
                { firstName: { contains: query, mode: 'insensitive' as const } },
                { lastName: { contains: query, mode: 'insensitive' as const } }
              ]
            }
          : {})
      };
      const [members, total, telegramAdministrators, syncState] = await Promise.all([
        prisma.telegramCommunityMember.findMany({
          where,
          orderBy: [{ firstName: 'asc' }, { username: 'asc' }, { telegramUserId: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.telegramCommunityMember.count({ where }),
        callGroupHelpTelegramApi<
          Array<{
            status?: string;
            custom_title?: string;
            user?: { id?: number | string };
          }>
        >('getChatAdministrators', { chat_id: chatId }).catch(() => []),
        prisma.telegramCommunityState.findUnique({
          where: {
            bot_chatId: { bot: 'TELEGRAM_MTPROTO_MEMBER_SYNC', chatId }
          },
          select: { payload: true, updatedAt: true, expiresAt: true }
        })
      ]);
      const nameChangeCounts = members.length
        ? await prisma.telegramCommunityMemberIdentityHistory.groupBy({
            by: ['telegramUserId'],
            where: {
              chatId,
              telegramUserId: { in: members.map((member) => member.telegramUserId) },
              changedFields: { has: 'name' }
            },
            _count: { _all: true }
          })
        : [];
      const administrators = new Map(
        telegramAdministrators
          .filter((member) => member.user?.id != null)
          .map((member) => [String(member.user!.id), member])
      );
      const nameChangesByMember = new Map(
        nameChangeCounts.map((entry) => [entry.telegramUserId, entry._count._all])
      );
      res.json({
        scope,
        chatId,
        page,
        pageSize,
        total,
        synchronizedAt: syncState?.updatedAt || null,
        nextSyncAt: syncState?.expiresAt || null,
        members: members.map((member) => {
          const administrator = administrators.get(member.telegramUserId);
          const displayName =
            [member.firstName, member.lastName].filter(Boolean).join(' ').trim() ||
            (member.username ? `@${member.username}` : `Telegram ${member.telegramUserId}`);
          return {
            ...member,
            displayName,
            mention: member.username
              ? `@${member.username}`
              : `<a href="tg://user?id=${member.telegramUserId}">${escapeHtml(displayName)}</a>`,
            commandTarget: member.username ? `@${member.username}` : member.telegramUserId,
            nameChangeCount: nameChangesByMember.get(member.telegramUserId) || 0,
            telegramAdministrator: Boolean(administrator),
            telegramAdministratorTitle: administrator?.custom_title || null
          };
        })
      });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/members/:telegramUserId/identity-history',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const values = await groupHelpConfigMap();
      const requestedScope = String(req.query.scope || 'main').toLowerCase();
      const scope =
        requestedScope === 'staff'
          ? 'staff'
          : requestedScope === 'off-topic'
            ? 'off-topic'
            : 'main';
      const chatId =
        scope === 'staff'
          ? values.telegramGroupHelpStaffGroupId?.trim() || ''
          : scope === 'off-topic'
            ? values.telegramGroupHelpOffTopicGroupChatId?.trim() || ''
            : values.telegramGroupHelpGroupChatId?.trim() || '';
      if (!chatId) {
        return res.status(400).json({ message: `The ${scope} Telegram group is not configured.` });
      }
      const telegramUserId = routeParam(req, 'telegramUserId');
      if (!/^\d{1,32}$/.test(telegramUserId)) {
        return res.status(400).json({ message: 'A numeric Telegram user ID is required.' });
      }
      const history = await prisma.telegramCommunityMemberIdentityHistory.findMany({
        where: { chatId, telegramUserId },
        orderBy: { observedAt: 'desc' },
        take: 100
      });
      res.json({ scope, chatId, telegramUserId, history });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/roles',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const values = await groupHelpConfigMap();
      const chatId = String(req.query.chatId || values.telegramGroupHelpGroupChatId || '').trim();
      if (!chatId)
        return res.status(400).json({ message: 'Choose a configured Telegram group first.' });
      const assignments = await prisma.telegramCommunityRoleAssignment.findMany({
        where: { chatId },
        include: { customRole: { select: { id: true, name: true, permissions: true } } },
        orderBy: [{ role: 'asc' }, { updatedAt: 'desc' }]
      });
      const customRoles = await prisma.telegramCommunityCustomRole.findMany({
        where: { chatId, NOT: { name: { startsWith: 'HH staff ' } } },
        orderBy: { name: 'asc' }
      });
      const staffGroupId = values.telegramGroupHelpStaffGroupId?.trim() || '';
      const staffMembers = staffGroupId
        ? await prisma.telegramCommunityMember.findMany({
            where: { chatId: staffGroupId, leftAt: null },
            orderBy: [{ firstName: 'asc' }, { updatedAt: 'desc' }],
            take: 250
          })
        : [];
      const assignmentsByUser = new Map(
        assignments.map((assignment) => [assignment.telegramUserId, assignment])
      );
      const staffWithPermissions = staffMembers.map((member) => {
        const assignment = assignmentsByUser.get(member.telegramUserId);
        const customPermissions = assignment?.customRole?.permissions;
        const permissions = Array.isArray(customPermissions)
          ? customPermissions.filter(
              (permission): permission is string => typeof permission === 'string'
            )
          : assignment?.role === 'MODERATOR'
            ? GROUP_HELP_COMMAND_DEFINITIONS.filter((definition) =>
                ['HELPER', 'MODERATOR'].includes(definition.minimumRole)
              ).map((definition) => definition.command)
            : assignment?.role === 'HELPER'
              ? GROUP_HELP_COMMAND_DEFINITIONS.filter(
                  (definition) => definition.minimumRole === 'HELPER'
                ).map((definition) => definition.command)
              : [];
        return { ...member, assignment, permissions, fullAdmin: permissions.includes('*') };
      });
      res.json({
        chatId,
        staffGroupId,
        assignments,
        customRoles,
        staffMembers: staffWithPermissions,
        permissionGroups: GROUP_HELP_STAFF_PERMISSION_GROUPS
      });
    })
  );

  router.patch(
    '/admin/telegram-bots/group-help/staff-permissions',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = groupHelpStaffPermissionsSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: 'Choose a staff member and valid permissions.' });
      }
      const values = await groupHelpConfigMap();
      const chatId = values.telegramGroupHelpGroupChatId?.trim() || '';
      const staffGroupId = values.telegramGroupHelpStaffGroupId?.trim() || '';
      if (!chatId || !staffGroupId) {
        return res
          .status(400)
          .json({ message: 'Configure both the main and private staff groups.' });
      }
      let permissions: string[];
      try {
        permissions = await saveGroupHelpStaffPermissions({
          mainGroupId: chatId,
          staffGroupId,
          telegramUserId: parsed.data.telegramUserId,
          permissions: parsed.data.permissions,
          fullAdmin: parsed.data.fullAdmin,
          actorId: req.user!.id
        });
      } catch (error) {
        if (error instanceof GroupHelpStaffPermissionError) {
          return res.status(400).json({ message: error.message });
        }
        throw error;
      }
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_group_help.staff_permissions_update',
        targetType: 'telegram_group_help_staff_member',
        targetId: parsed.data.telegramUserId,
        summary: permissions.length
          ? `Updated bot permissions for Telegram staff member ${parsed.data.telegramUserId}.`
          : `Removed bot permissions from Telegram staff member ${parsed.data.telegramUserId}.`,
        metadata: { chatId, staffGroupId, permissions }
      });
      res.json({ ok: true, telegramUserId: parsed.data.telegramUserId, permissions });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/roles',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = groupHelpRoleSchema.safeParse(req.body ?? {});
      if (!parsed.success)
        return res
          .status(400)
          .json({ message: 'Enter a numeric Telegram user ID and choose one role.' });
      const values = await groupHelpConfigMap();
      const chatId = parsed.data.chatId || values.telegramGroupHelpGroupChatId?.trim();
      if (!chatId)
        return res.status(400).json({ message: 'Choose a configured Telegram group first.' });
      const customRole = parsed.data.customRoleId
        ? await prisma.telegramCommunityCustomRole.findFirst({
            where: { id: parsed.data.customRoleId, chatId },
            select: { id: true, name: true }
          })
        : null;
      if (parsed.data.customRoleId && !customRole)
        return res
          .status(400)
          .json({ message: 'That custom role is not available in this group.' });
      const role = parsed.data.role || 'CUSTOM';
      const assignment = await replaceTelegramCommunityRoleAssignment({
        chatId,
        telegramUserId: parsed.data.telegramUserId,
        role,
        customRoleId: customRole?.id,
        assignedById: req.user!.id
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_group_help.role_assign',
        targetType: 'telegram_group_help_role',
        targetId: assignment.id,
        summary: `Assigned ${(customRole?.name || assignment.role).toLowerCase()} role to Telegram user ${assignment.telegramUserId}; replaced any other community role.`,
        metadata: {
          chatId,
          telegramUserId: assignment.telegramUserId,
          role: assignment.role,
          customRoleId: customRole?.id
        }
      });
      res.status(201).json({ assignment });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/custom-roles',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = groupHelpCustomRoleSchema.safeParse(req.body ?? {});
      if (!parsed.success)
        return res
          .status(400)
          .json({ message: 'Enter a role name and at least one valid /command.' });
      const values = await groupHelpConfigMap();
      const chatId = parsed.data.chatId || values.telegramGroupHelpGroupChatId?.trim();
      if (!chatId)
        return res.status(400).json({ message: 'Choose a configured Telegram group first.' });
      const permissions = [
        ...new Set(parsed.data.permissions.map((permission) => permission.toLowerCase()))
      ];
      const role = await prisma.telegramCommunityCustomRole.upsert({
        where: { chatId_name: { chatId, name: parsed.data.name } },
        create: { chatId, name: parsed.data.name, permissions, createdById: req.user!.id },
        update: { permissions }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_group_help.custom_role_save',
        targetType: 'telegram_group_help_custom_role',
        targetId: role.id,
        summary: `Saved custom staff role ${role.name}.`,
        metadata: { chatId, permissions }
      });
      res.status(201).json({ role });
    })
  );

  router.delete(
    '/admin/telegram-bots/group-help/custom-roles/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const role = await prisma.telegramCommunityCustomRole.findUnique({
        where: { id: routeParam(req, 'id') }
      });
      if (!role) return res.status(404).json({ message: 'Custom role was not found.' });
      await prisma.telegramCommunityCustomRole.delete({ where: { id: role.id } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_group_help.custom_role_delete',
        targetType: 'telegram_group_help_custom_role',
        targetId: role.id,
        summary: `Deleted custom staff role ${role.name}.`,
        metadata: { chatId: role.chatId }
      });
      res.json({ ok: true });
    })
  );

  router.delete(
    '/admin/telegram-bots/group-help/roles/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const assignmentId = routeParam(req, 'id');
      const assignment = await prisma.telegramCommunityRoleAssignment.findUnique({
        where: { id: assignmentId }
      });
      if (!assignment) return res.status(404).json({ message: 'Role assignment was not found.' });
      await prisma.telegramCommunityRoleAssignment.delete({ where: { id: assignment.id } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_group_help.role_revoke',
        targetType: 'telegram_group_help_role',
        targetId: assignment.id,
        summary: `Removed ${assignment.role.toLowerCase()} role from Telegram user ${assignment.telegramUserId}.`,
        metadata: {
          chatId: assignment.chatId,
          telegramUserId: assignment.telegramUserId,
          role: assignment.role
        }
      });
      res.json({ ok: true });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/moderation-cases',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const values = await groupHelpConfigMap();
      const chatId = String(req.query.chatId || values.telegramGroupHelpGroupChatId || '').trim();
      if (!chatId)
        return res.status(400).json({ message: 'Choose a configured Telegram group first.' });
      const cases = await prisma.telegramCommunityModerationCase.findMany({
        where: { chatId },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 100
      });
      res.json({ chatId, cases });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/moderation-cases/:id/resolve',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = groupHelpModerationResolutionSchema.safeParse(req.body ?? {});
      if (!parsed.success)
        return res.status(400).json({ message: 'Choose a valid moderation action.' });
      const caseId = routeParam(req, 'id');
      const moderationCase = await prisma.telegramCommunityModerationCase.findUnique({
        where: { id: caseId }
      });
      if (!moderationCase)
        return res.status(404).json({ message: 'Moderation case was not found.' });
      if (moderationCase.status !== 'OPEN') {
        return res.status(409).json({ message: 'This moderation case has already been resolved.' });
      }
      const targetUserId = moderationCase.targetUserId ? Number(moderationCase.targetUserId) : NaN;
      if (
        !['NO_ACTION', 'DELETE', 'APPROVE'].includes(parsed.data.action) &&
        !Number.isSafeInteger(targetUserId)
      ) {
        return res
          .status(400)
          .json({ message: 'This report has no Telegram member available for that action.' });
      }
      if (parsed.data.action === 'DELETE' && !moderationCase.reportedMessageId) {
        return res.status(400).json({ message: 'This report has no message available to remove.' });
      }
      const groupValues = await groupHelpConfigMap();
      if (parsed.data.action === 'APPROVE') {
        if (moderationCase.reason !== 'FIRST_MESSAGE_REVIEW' || !moderationCase.targetUserId) {
          return res
            .status(400)
            .json({ message: 'Only a first-message review can approve a member.' });
        }
        await approveGroupHelpMemberFirstMessage(
          moderationCase.chatId,
          moderationCase.targetUserId
        );
      } else if (parsed.data.action === 'DELETE' && moderationCase.reportedMessageId) {
        await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'deleteMessage', {
          chat_id: moderationCase.chatId,
          message_id: moderationCase.reportedMessageId
        });
      } else if (parsed.data.action === 'MUTE') {
        await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'restrictChatMember', {
          chat_id: moderationCase.chatId,
          user_id: targetUserId,
          permissions: { can_send_messages: false },
          until_date:
            Math.floor(Date.now() / 1000) +
            Math.max(1, Math.min(10_080, Number(groupValues.telegramGroupHelpMuteMinutes || 60))) *
              60
        });
      } else if (parsed.data.action === 'BAN' || parsed.data.action === 'KICK') {
        await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'banChatMember', {
          chat_id: moderationCase.chatId,
          user_id: targetUserId,
          revoke_messages: false
        });
        if (parsed.data.action === 'KICK') {
          await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'unbanChatMember', {
            chat_id: moderationCase.chatId,
            user_id: targetUserId,
            only_if_banned: true
          });
        }
      }
      const resolved = await prisma.telegramCommunityModerationCase.update({
        where: { id: moderationCase.id },
        data: {
          status: 'RESOLVED',
          action: parsed.data.action,
          resolvedByUserId: req.user!.id,
          resolvedAt: new Date()
        }
      });
      await sendGroupHelpActivityLog(groupValues, 'Staff review completed', [
        `Group: ${resolved.chatId}`,
        `Case: ${resolved.id.slice(-6)}`,
        `Outcome: ${parsed.data.action}`,
        resolved.targetUserId ? `Member ID: ${resolved.targetUserId}` : null
      ]);
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_group_help.moderation_case_resolve',
        targetType: 'telegram_moderation_case',
        targetId: resolved.id,
        summary: `Resolved a Telegram report with ${parsed.data.action.toLowerCase().replace('_', ' ')}.`,
        metadata: {
          chatId: resolved.chatId,
          targetUserId: resolved.targetUserId,
          action: parsed.data.action
        }
      });
      res.json({ moderationCase: resolved });
    })
  );

  router.patch(
    '/admin/telegram-bots/group-help',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = groupHelpSaveSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid Group Help config payload.' });
      }
      try {
        const scope = parsed.data.scope || 'main';
        await persistScopedGroupHelpConfig(scope, parsed.data.entries, {
          id: req.user!.id,
          role: req.user!.role
        });
      } catch (error) {
        return res.status(400).json({
          message: error instanceof Error ? error.message : 'Invalid Group Help config payload.'
        });
      }

      const scope = parsed.data.scope || 'main';
      const globalValues = await groupHelpConfigMap();
      const target = managedGroupHelpTarget(globalValues, scope);
      const values = target.chatId ? await groupHelpConfigMap(target.chatId) : globalValues;
      res.json({
        selectedGroup: target,
        config: serializedGroupHelpConfig(values, scope)
      });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/apply',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = groupHelpApplySchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: 'Invalid Group Help action.' });
      const action = GROUP_HELP_ACTIONS.find((item) => item.id === parsed.data.actionId);
      if (!action) return res.status(404).json({ message: 'Unknown Group Help action.' });

      const scope = parsed.data.scope || 'main';
      const globalValues = await groupHelpConfigMap();
      const target = managedGroupHelpTarget(globalValues, scope);
      if (!target.chatId)
        return res.status(400).json({ message: `${target.label} is not configured.` });
      const values = await groupHelpConfigMap(target.chatId);
      const rendered = renderGroupHelpCommand(action, values);
      if (!rendered.raw) return res.status(400).json({ message: `${action.title} is empty.` });

      if (action.applyMode === 'DIRECT_PIN') {
        const result = await sendGroupHelpPost({
          message: rendered.raw,
          imageUrl: rendered.imageUrl || undefined,
          pin: true,
          chatId: target.chatId
        });
        await writeAuditLog({
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'telegram_group_help.action_apply',
          targetType: 'telegram_group_help',
          targetId: action.id,
          summary: `Applied Group Help action: ${action.title}.`,
          metadata: {
            mode: action.applyMode,
            scope,
            chatId: result.chatId,
            messageId: result.sent.message_id
          }
        });
        return res.json({ ok: true, mode: 'APPLIED', action, result });
      }

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_group_help.action_apply',
        targetType: 'telegram_group_help',
        targetId: action.id,
        summary: `Applied ${GROUP_HELP_BOT_DISPLAY_NAME} setting: ${action.title}.`,
        metadata: { mode: 'DATABASE_CONFIG', scope, chatId: target.chatId }
      });
      return res.json({
        ok: true,
        mode: 'APPLIED',
        action,
        message: `${action.title} is active in ${GROUP_HELP_BOT_DISPLAY_NAME}.`
      });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/test',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      if (!groupHelpBotToken()) {
        return res.json({
          tokenConfigured: false,
          ok: false,
          message: 'TELEGRAM_HOPEHUBBOT_TOKEN is not configured.'
        });
      }

      const values = await groupHelpConfigMap();
      const chatId = values.telegramGroupHelpGroupChatId?.trim();
      const [me, webhook] = await Promise.all([
        callGroupHelpTelegramApi<{ id: number; username?: string }>('getMe', {}),
        callGroupHelpTelegramApi('getWebhookInfo', {})
      ]);

      let chat: Record<string, unknown> | null = null;
      let botMembership: Record<string, unknown> | null = null;
      let chatError: string | null = null;
      if (chatId) {
        try {
          [chat, botMembership] = await Promise.all([
            callGroupHelpTelegramApi<Record<string, unknown>>('getChat', { chat_id: chatId }),
            callGroupHelpTelegramApi<Record<string, unknown>>('getChatMember', {
              chat_id: chatId,
              user_id: me.id
            })
          ]);
        } catch (error) {
          chatError = error instanceof Error ? error.message : 'Could not read Telegram chat.';
        }
      }
      const requiredPermissions = [
        'can_delete_messages',
        'can_restrict_members',
        'can_promote_members',
        'can_pin_messages',
        'can_manage_video_chats'
      ];
      const missingBotPermissions =
        botMembership?.status === 'creator'
          ? []
          : requiredPermissions.filter((permission) => botMembership?.[permission] !== true);

      res.json({
        tokenConfigured: true,
        ok: true,
        me,
        webhook,
        chat,
        botMembership,
        missingBotPermissions,
        chatError
      });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/send',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = groupHelpSendSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid Group Help send payload.' });
      }

      if (!groupHelpBotToken()) {
        return res.status(400).json({ message: 'TELEGRAM_HOPEHUBBOT_TOKEN is not configured.' });
      }
      const imageUrl = parsed.data.imageUrl?.trim();
      const { chatId, sent, pinned } = await sendGroupHelpPost({
        message: parsed.data.message,
        imageUrl,
        pin: parsed.data.pin
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: parsed.data.pin
          ? 'telegram_group_help.message_send_pin'
          : 'telegram_group_help.message_send',
        targetType: 'telegram_group_help',
        targetId: chatId,
        summary: parsed.data.pin
          ? 'Sent and pinned Group Help message.'
          : 'Sent Group Help message.',
        metadata: {
          chatId,
          messageId: sent.message_id,
          pin: Boolean(parsed.data.pin),
          hasImage: Boolean(imageUrl)
        }
      });

      res.json({ ok: true, message: sent, pinned });
    })
  );

  router.get(
    '/admin/telegram-bots/content-network',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const [channels, pending, failed] = await Promise.all([
        prisma.telegramContentChannel.findMany({
          include: {
            sources: { orderBy: { name: 'asc' } },
            _count: { select: { items: true } }
          },
          orderBy: { name: 'asc' }
        }),
        prisma.telegramContentItem.count({ where: { status: 'PENDING' } }),
        prisma.telegramContentItem.count({ where: { status: 'FAILED' } })
      ]);
      const items = await prisma.telegramContentItem.findMany({
        include: {
          channel: { select: { name: true, slug: true } },
          source: { select: { name: true, attribution: true } }
        },
        where: { status: { in: ['PENDING', 'APPROVED', 'FAILED'] } },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 100
      });
      res.json({ channels, items, counts: { pending, failed } });
    })
  );

  router.post(
    '/admin/telegram-bots/content-network/channels',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const parsed = contentNetworkChannelSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: 'Invalid content channel.' });
      const channel = await prisma.telegramContentChannel.create({
        data: { ...parsed.data, bot: GROUP_HELP_BOT_SLUG }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_content_channel.create',
        targetType: 'telegram_content_channel',
        targetId: channel.id,
        summary: `Created Telegram content channel “${channel.name}”.`
      });
      res.status(201).json({ channel });
    })
  );

  router.put(
    '/admin/telegram-bots/content-network/channels/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const parsed = contentNetworkChannelSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: 'Invalid content channel.' });
      const channel = await prisma.telegramContentChannel.update({
        where: { id: routeParam(req, 'id') },
        data: parsed.data
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_content_channel.update',
        targetType: 'telegram_content_channel',
        targetId: channel.id,
        summary: `Updated Telegram content channel “${channel.name}”.`
      });
      res.json({ channel });
    })
  );

  router.delete(
    '/admin/telegram-bots/content-network/channels/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      await prisma.telegramContentChannel.delete({ where: { id: routeParam(req, 'id') } });
      res.json({ ok: true });
    })
  );

  router.post(
    '/admin/telegram-bots/content-network/sources',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const parsed = contentNetworkSourceSchema.safeParse(req.body ?? {});
      if (!parsed.success || !validPublicHttpsUrl(parsed.data?.feedUrl)) {
        return res.status(400).json({ message: 'Use a public HTTPS RSS or Atom feed URL.' });
      }
      const source = await prisma.telegramContentSource.create({
        data: { ...parsed.data, nextFetchAt: new Date() }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_content_source.create',
        targetType: 'telegram_content_source',
        targetId: source.id,
        summary: `Added RSS source “${source.name}”.`
      });
      res.status(201).json({ source });
    })
  );

  router.put(
    '/admin/telegram-bots/content-network/sources/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const parsed = contentNetworkSourceSchema.safeParse(req.body ?? {});
      if (!parsed.success || !validPublicHttpsUrl(parsed.data?.feedUrl)) {
        return res.status(400).json({ message: 'Use a public HTTPS RSS or Atom feed URL.' });
      }
      const source = await prisma.telegramContentSource.update({
        where: { id: routeParam(req, 'id') },
        data: { ...parsed.data, nextFetchAt: new Date(), lastError: null }
      });
      res.json({ source });
    })
  );

  router.delete(
    '/admin/telegram-bots/content-network/sources/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      await prisma.telegramContentSource.delete({ where: { id: routeParam(req, 'id') } });
      res.json({ ok: true });
    })
  );

  router.post(
    '/admin/telegram-bots/content-network/sources/:id/refresh',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const result = await refreshTelegramContentSource(routeParam(req, 'id'));
      res.json({ result });
    })
  );

  router.post(
    '/admin/telegram-bots/content-network/items/:id/review',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const parsed = contentNetworkReviewSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: 'Choose approve or reject.' });
      const item = await reviewTelegramContentItem({
        itemId: routeParam(req, 'id'),
        status: parsed.data.status,
        scheduledFor: parsed.data.scheduledFor,
        reviewerId: req.user!.id
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: `telegram_content_item.${parsed.data.status.toLowerCase()}`,
        targetType: 'telegram_content_item',
        targetId: item.id,
        summary: `${parsed.data.status === 'APPROVED' ? 'Approved' : 'Rejected'} content candidate “${item.title}”.`
      });
      res.json({ item });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/campaigns',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const campaigns = await prisma.telegramCampaign.findMany({
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          deliveries: {
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: { _count: { select: { votes: true } } }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
      res.json({ campaigns, botConfigured: Boolean(groupHelpBotStatus().configured) });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/campaigns',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const parsed = campaignSaveSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.issues[0]?.message || 'Invalid Telegram campaign.'
        });
      }
      const values = await groupHelpConfigMap();
      const chatId = parsed.data.chatId || values.telegramGroupHelpGroupChatId?.trim();
      if (!chatId) return res.status(400).json({ message: 'Telegram group chat ID is required.' });
      const campaign = await prisma.telegramCampaign.create({
        data: {
          name: parsed.data.name,
          source: 'ADMIN',
          templateVersion: 0,
          bot: GROUP_HELP_BOT_SLUG,
          chatId,
          timezone: parsed.data.timezone,
          intervalMinutes: parsed.data.intervalMinutes,
          repeat: parsed.data.repeat,
          isActive: parsed.data.isActive,
          nextRunAt: parsed.data.isActive ? parsed.data.startsAt || new Date() : null,
          createdById: req.user!.id,
          items: {
            create: parsed.data.items.map((item, index) =>
              campaignItemData(
                {
                  ...item,
                  messageThreadId:
                    item.messageThreadId ||
                    Number(values.telegramCommunityDefaultTopicId) ||
                    undefined
                },
                index
              )
            )
          }
        },
        include: { items: { orderBy: { sortOrder: 'asc' } } }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_campaign.create',
        targetType: 'telegram_campaign',
        targetId: campaign.id,
        summary: `Created Telegram campaign “${campaign.name}”.`,
        metadata: { chatId, itemCount: campaign.items.length, isActive: campaign.isActive }
      });
      res.status(201).json({ campaign });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/deliveries/:id/retry',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const delivery = await retryTelegramCampaignDelivery(routeParam(req, 'id'));
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_campaign.delivery_retry',
        targetType: 'telegram_campaign_delivery',
        targetId: delivery!.id,
        summary: `Retried Telegram campaign delivery: ${delivery!.status}.`
      });
      res.json({ delivery });
    })
  );

  router.put(
    '/admin/telegram-bots/group-help/campaigns/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const parsed = campaignSaveSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.issues[0]?.message || 'Invalid Telegram campaign.'
        });
      }
      const existing = await prisma.telegramCampaign.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Campaign not found.' });
      const values = await groupHelpConfigMap();
      const chatId = parsed.data.chatId || values.telegramGroupHelpGroupChatId?.trim();
      if (!chatId) return res.status(400).json({ message: 'Telegram group chat ID is required.' });
      const campaign = await prisma.$transaction(async (tx) => {
        await tx.telegramCampaignItem.deleteMany({ where: { campaignId: id } });
        return tx.telegramCampaign.update({
          where: { id },
          data: {
            name: parsed.data.name,
            source: 'ADMIN',
            templateVersion: 0,
            chatId,
            timezone: parsed.data.timezone,
            intervalMinutes: parsed.data.intervalMinutes,
            repeat: parsed.data.repeat,
            isActive: parsed.data.isActive,
            currentItemIndex: 0,
            nextRunAt: parsed.data.isActive
              ? parsed.data.startsAt || existing.nextRunAt || new Date()
              : null,
            items: {
              create: parsed.data.items.map((item, index) =>
                campaignItemData(
                  {
                    ...item,
                    messageThreadId:
                      item.messageThreadId ||
                      Number(values.telegramCommunityDefaultTopicId) ||
                      undefined
                  },
                  index
                )
              )
            }
          },
          include: { items: { orderBy: { sortOrder: 'asc' } } }
        });
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_campaign.update',
        targetType: 'telegram_campaign',
        targetId: campaign.id,
        summary: `Updated Telegram campaign “${campaign.name}”.`
      });
      res.json({ campaign });
    })
  );

  router.patch(
    '/admin/telegram-bots/group-help/campaigns/:id/status',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const parsed = campaignToggleSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: 'Choose active or paused.' });
      const campaign = await prisma.telegramCampaign.update({
        where: { id },
        data: {
          isActive: parsed.data.isActive,
          nextRunAt: parsed.data.isActive ? new Date() : null
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: parsed.data.isActive ? 'telegram_campaign.activate' : 'telegram_campaign.pause',
        targetType: 'telegram_campaign',
        targetId: campaign.id,
        summary: `${parsed.data.isActive ? 'Activated' : 'Paused'} Telegram campaign “${campaign.name}”.`
      });
      res.json({ campaign });
    })
  );

  router.delete(
    '/admin/telegram-bots/group-help/campaigns/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const existing = await prisma.telegramCampaign.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Campaign not found.' });
      await prisma.telegramCampaign.delete({ where: { id } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_campaign.delete',
        targetType: 'telegram_campaign',
        targetId: id,
        summary: `Deleted Telegram campaign “${existing.name}”.`
      });
      res.json({ ok: true });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/campaigns/:id/results',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const deliveries = await prisma.telegramCampaignDelivery.findMany({
        where: { campaignId: id, telegramPollId: { not: null } },
        include: { item: true, votes: { orderBy: { votedAt: 'desc' } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json({
        results: deliveries.map((delivery) => {
          const snapshot =
            delivery.pollSnapshot && typeof delivery.pollSnapshot === 'object'
              ? (delivery.pollSnapshot as Record<string, unknown>)
              : {};
          const snapshotOptions = Array.isArray(snapshot.options)
            ? snapshot.options.map((option) =>
                typeof option === 'object' && option && 'text' in option
                  ? String(option.text)
                  : String(option)
              )
            : [];
          const options = Array.isArray(delivery.item?.pollOptions)
            ? delivery.item.pollOptions.map(String)
            : snapshotOptions;
          const counts = options.map(
            (_option, optionId) =>
              delivery.votes.filter(
                (vote) => Array.isArray(vote.optionIds) && vote.optionIds.includes(optionId)
              ).length
          );
          return {
            id: delivery.id,
            question: delivery.item?.pollQuestion || String(snapshot.question || ''),
            anonymous: delivery.item?.pollAnonymous ?? Boolean(snapshot.is_anonymous),
            options: options.map((text, index) => ({ text, votes: counts[index] })),
            totalVoters: delivery.totalVoterCount,
            status: delivery.status,
            sentAt: delivery.sentAt,
            voters:
              (delivery.item?.pollAnonymous ?? Boolean(snapshot.is_anonymous)) ? [] : delivery.votes
          };
        })
      });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/events',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const events = await prisma.telegramCommunityEvent.findMany({
        include: { rsvps: { where: { status: 'GOING' }, orderBy: { createdAt: 'desc' } } },
        orderBy: { startsAt: 'desc' },
        take: 100
      });
      res.json({ events });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/events',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const parsed = communityEventSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: parsed.error.issues[0]?.message || 'Invalid event.' });
      }
      if (parsed.data.startsAt <= new Date()) {
        return res.status(400).json({ message: 'Choose a future event time.' });
      }
      const values = await groupHelpConfigMap();
      const chatId = parsed.data.chatId || values.telegramGroupHelpGroupChatId?.trim();
      if (!chatId) return res.status(400).json({ message: 'Telegram group chat ID is required.' });
      const { recurrence, occurrences, ...eventData } = parsed.data;
      const total = recurrence === 'ONCE' ? 1 : occurrences;
      const startsAt = (index: number) => {
        const date = new Date(eventData.startsAt);
        if (recurrence === 'DAILY') date.setDate(date.getDate() + index);
        if (recurrence === 'WEEKLY') date.setDate(date.getDate() + index * 7);
        if (recurrence === 'WEEKDAYS') {
          let remaining = index;
          while (remaining > 0) {
            date.setDate(date.getDate() + 1);
            if (![0, 6].includes(date.getDay())) remaining--;
          }
        }
        return date;
      };
      const events = await prisma.$transaction(
        Array.from({ length: total }, (_, index) => {
          const occurrenceStartsAt = startsAt(index);
          return prisma.telegramCommunityEvent.create({
            data: {
              ...eventData,
              startsAt: occurrenceStartsAt,
              announcementDueAt: new Date(occurrenceStartsAt.getTime() - 60 * 60 * 1000),
              chatId,
              createdById: req.user!.id
            }
          });
        })
      );
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_community_event.create',
        targetType: 'telegram_community_event',
        targetId: events[0].id,
        summary: `Created ${events.length} Telegram event${events.length === 1 ? '' : 's'} for “${events[0].title}”.`
      });
      res.status(201).json({ event: events[0], events });
    })
  );

  router.put(
    '/admin/telegram-bots/group-help/events/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const parsed = communityEventSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: parsed.error.issues[0]?.message || 'Invalid event.' });
      }
      const values = await groupHelpConfigMap();
      const chatId = parsed.data.chatId || values.telegramGroupHelpGroupChatId?.trim();
      if (!chatId) return res.status(400).json({ message: 'Telegram group chat ID is required.' });
      const { recurrence: _recurrence, occurrences: _occurrences, ...eventData } = parsed.data;
      const event = await prisma.telegramCommunityEvent.update({
        where: { id },
        data: {
          ...eventData,
          chatId,
          reminderSentAt: null,
          announcementDueAt: new Date(eventData.startsAt.getTime() - 60 * 60 * 1000),
          status: 'SCHEDULED'
        }
      });
      if (event.telegramMessageId) await refreshTelegramCommunityEventAnnouncement(event.id);
      res.json({ event });
    })
  );

  router.delete(
    '/admin/telegram-bots/group-help/events/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const deleted = await deleteTelegramCommunityEvent(id);
      if (!deleted) return res.status(404).json({ message: 'Event not found.' });
      res.json({ ok: true });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/confessions',
    authRequired,
    asyncRoute(async (_req, res) =>
      res.status(403).json({
        message:
          'Confession content and sender identity are available only in the private Confession bot review inbox.'
      })
    )
  );

  router.post(
    '/admin/telegram-bots/group-help/confessions/:reference/review',
    authRequired,
    asyncRoute(async (_req, res) =>
      res.status(403).json({
        message: 'Confession approval is restricted to the private Confession bot review inbox.'
      })
    )
  );

  router.get(
    '/admin/telegram-bots/group-help/engagement',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [activeCampaigns, posts, pollVotes, reactions, newMembers, rsvps, failedFollowUps] =
        await Promise.all([
          prisma.telegramCampaign.count({ where: { isActive: true } }),
          prisma.telegramCampaignDelivery.count({
            where: { status: { in: ['SENT', 'CLOSED'] }, sentAt: { gte: since } }
          }),
          prisma.telegramPollVote.count({ where: { votedAt: { gte: since } } }),
          prisma.telegramCommunityReaction.count({ where: { reactedAt: { gte: since } } }),
          prisma.telegramCommunityMember.count({ where: { joinedAt: { gte: since } } }),
          prisma.telegramCommunityEventRsvp.count({ where: { createdAt: { gte: since } } }),
          prisma.telegramPollVote.count({ where: { followUpError: { not: null } } })
        ]);
      res.json({
        periodDays: 7,
        activeCampaigns,
        posts,
        pollVotes,
        reactions,
        newMembers,
        rsvps,
        failedFollowUps
      });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/media',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      try {
        const form = await parseMultipartForm(req, { maxFileBytes: 5 * 1024 * 1024 });
        if (!form.file) return res.status(400).json({ message: 'Choose media to upload.' });
        if (!GROUP_HELP_MEDIA_MIME_TYPES.has(form.file.mimeType)) {
          return res
            .status(400)
            .json({ message: 'Only JPG, PNG, WebP, GIF, MP4, WebM, and MOV files are allowed.' });
        }
        const saved = await saveHopeHubMedia({
          mimeType: form.file.mimeType,
          fileName: form.fields['fileName'] || form.file.fileName || undefined,
          data: form.file.buffer,
          uploadedById: req.user!.id
        });

        await writeAuditLog({
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'telegram_group_help.media_upload',
          targetType: 'telegram_group_help_media',
          targetId: saved.storageKey,
          summary: `Uploaded Group Help media "${form.fields['fileName'] || form.file.fileName || saved.storageKey}".`
        });

        res.status(201).json(saved);
      } catch (error) {
        const code = error instanceof Error ? error.message : '';
        if (code === 'UNSUPPORTED_MIME') {
          return res
            .status(400)
            .json({ message: 'Only JPG, PNG, WebP, GIF, MP4, WebM, and MOV files are allowed.' });
        }
        if (code === 'EMPTY_FILE') {
          return res.status(400).json({ message: 'Media file is empty.' });
        }
        if (code === 'FILE_TOO_LARGE') {
          return res.status(400).json({ message: 'Media upload must be 5 MB or smaller.' });
        }
        throw error;
      }
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/clear-menu',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      if (!groupHelpBotToken()) {
        return res.status(400).json({ message: 'TELEGRAM_HOPEHUBBOT_TOKEN is not configured.' });
      }

      const result = await callGroupHelpTelegramApi('setChatMenuButton', {
        menu_button: { type: 'default' }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_group_help.clear_menu_button',
        targetType: 'telegram_group_help',
        targetId: 'bot_menu',
        summary: 'Cleared website menu button from Group Help bot.',
        metadata: { bot: 'Hopehubbot' }
      });

      res.json({ ok: true, result });
    })
  );

  router.post(
    '/admin/telegram-bots/:bot/setup',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const slug = routeParam(req, 'bot');
      const kind = telegramBotKindFromSlug(slug);
      const communityBot = communityBotFromSlug(slug);
      if (!kind && !communityBot) return res.status(404).json({ message: 'Unknown Telegram bot.' });

      const parsed = setupSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid Telegram setup payload.' });
      }

      if (kind) await setTelegramCommands(kind);
      const menuButton =
        kind === TelegramBotKind.USER ? await setTelegramWebsiteMenuButton(kind) : null;
      const webhook = kind
        ? await setTelegramWebhook({
            kind,
            dropPendingUpdates: parsed.data.dropPendingUpdates,
            publicApiUrl: parsed.data.publicApiUrl
          })
        : await setupCommunityBot({
            slug: communityBot!,
            dropPendingUpdates: parsed.data.dropPendingUpdates,
            publicApiUrl: parsed.data.publicApiUrl || apiUrl(),
            webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || ''
          });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_bot.setup',
        targetType: 'telegram_bot',
        targetId: kind || communityBot!,
        summary: `Updated Telegram commands, menu button, and webhook for ${slug} bot.`,
        metadata: { slug, dropPendingUpdates: Boolean(parsed.data.dropPendingUpdates) }
      });

      res.json({ ok: true, webhook, menuButton });
    })
  );

  router.post(
    '/admin/telegram-bots/setup-all',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = setupSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid Telegram setup payload.' });
      }

      const accountResults = await Promise.all(
        telegramBotStatus()
          .filter((bot) => bot.configured)
          .map(async (bot) => {
            const kind = bot.kind;
            await setTelegramCommands(kind);
            const menuButton =
              kind === TelegramBotKind.USER ? await setTelegramWebsiteMenuButton(kind) : null;
            const webhook = await setTelegramWebhook({
              kind,
              dropPendingUpdates: parsed.data.dropPendingUpdates,
              publicApiUrl: parsed.data.publicApiUrl
            });
            return { kind, webhook, menuButton };
          })
      );
      const communityResults = await Promise.all(
        communityBotStatus()
          .filter((bot) => bot.configured)
          .map(async (bot) => ({
            kind: bot.kind,
            menuButton: null,
            webhook: await setupCommunityBot({
              slug: bot.slug,
              dropPendingUpdates: parsed.data.dropPendingUpdates,
              publicApiUrl: parsed.data.publicApiUrl || apiUrl(),
              webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || ''
            })
          }))
      );
      const results = [...accountResults, ...communityResults];

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_bot.setup_all',
        targetType: 'telegram_bot',
        targetId: 'all',
        summary: 'Updated Telegram commands, menu buttons, and webhooks for all configured bots.',
        metadata: { dropPendingUpdates: Boolean(parsed.data.dropPendingUpdates) }
      });

      res.json({ ok: true, results });
    })
  );

  router.post(
    '/admin/telegram-bots/sessions/:id/unlink',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const sessionId = routeParam(req, 'id');
      const existing = await prisma.telegramBotSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          botKind: true,
          chatId: true,
          username: true,
          firstName: true,
          lastName: true,
          linkedUserId: true,
          linkedUser: { select: { id: true, email: true, name: true, role: true } }
        }
      });
      if (!existing) return res.status(404).json({ message: 'Telegram session not found.' });

      const session = await prisma.telegramBotSession.update({
        where: { id: sessionId },
        data: {
          linkedUserId: null,
          state: 'NEW',
          lastCommand: null,
          metadata: {
            adminUnlinkedAt: new Date().toISOString(),
            previousLinkedUserId: existing.linkedUserId
          }
        },
        select: {
          id: true,
          botKind: true,
          chatId: true,
          username: true,
          firstName: true,
          lastName: true,
          linkedUserId: true,
          state: true,
          lastCommand: true,
          createdAt: true,
          updatedAt: true
        }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_bot.session.unlink',
        targetType: 'telegram_bot_session',
        targetId: existing.id,
        summary: `Unlinked ${linkedName(existing)} from ${existing.botKind} bot.`,
        metadata: {
          botKind: existing.botKind,
          chatId: existing.chatId,
          previousLinkedUser: existing.linkedUser
        }
      });

      res.json({ session: { ...session, displayName: linkedName(session) } });
    })
  );
}
