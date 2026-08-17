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
import {
  TELEGRAM_BOT_CONTROL_DEFAULTS,
  TELEGRAM_BOT_CONTROL_KEYS,
  TELEGRAM_BOT_CONTROL_META
} from '../../constants/telegram-bot-controls.constants.js';
import {
  clearTelegramBotControlsCache,
  getTelegramBotControls
} from '../../services/telegram-bot-controls.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from '../../services/telegram-community-bots.client.js';
import { configuredUrlKeyboard } from '../../services/telegram-keyboard-config.js';
import {
  confessionDestinationLabel,
  publishedConfessionText
} from '../../services/telegram-confession-bot.js';
import {
  announceTelegramCommunityEvent,
  deleteTelegramCommunityEvent,
  refreshTelegramCommunityEventAnnouncement,
  retryTelegramCampaignDelivery
} from '../../services/telegram-community-campaigns.js';

const setupSchema = z.object({
  dropPendingUpdates: z.boolean().optional(),
  publicApiUrl: z.string().url().optional()
});

const groupHelpSaveSchema = z.object({
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
  actionId: z.string().trim().min(1).max(80)
});

const campaignItemSchema = z
  .object({
    kind: z.enum(['TEXT', 'POLL', 'SUMMARY']),
    text: z.string().trim().max(4096).optional(),
    imageUrl: z.preprocess(
      (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
      z.string().trim().url().optional()
    ),
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
    if (['TEXT', 'SUMMARY'].includes(item.kind) && !item.text) {
      context.addIssue({ code: 'custom', path: ['text'], message: 'Message text is required.' });
    }
    if (item.kind === 'POLL' && (!item.pollQuestion || !item.pollOptions?.length)) {
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

const communityEventSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1200).optional(),
  joinUrl: z.string().trim().url(),
  startsAt: z.coerce.date(),
  reminderMinutes: z.number().int().min(5).max(10_080).default(30),
  chatId: z.string().trim().max(80).optional()
});

const confessionReviewSchema = z.object({ action: z.enum(['APPROVE', 'REJECT']) });

const GROUP_HELP_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

async function groupHelpConfigMap() {
  const rows = await prisma.siteConfig.findMany({
    where: { key: { in: GROUP_HELP_CONFIG_KEYS } }
  });
  const values = {
    ...GROUP_HELP_CONFIG_DEFAULTS,
    ...Object.fromEntries(rows.map((row) => [row.key, row.value]))
  };
  if (values.telegramGroupHelpBotUsername?.replace(/^@/, '').toLowerCase() === 'hopehubbot') {
    values.telegramGroupHelpBotUsername = 'Hopehubaibot';
  }
  return values;
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

async function sendGroupHelpPost(input: { message: string; imageUrl?: string; pin?: boolean }) {
  const values = await groupHelpConfigMap();
  const chatId = values.telegramGroupHelpGroupChatId?.trim();
  if (!groupHelpBotToken()) throw new Error('TELEGRAM_HOPEHUBBOT_TOKEN is not configured.');
  if (!chatId) throw new Error('Telegram group chat ID is not configured.');

  const sent = input.imageUrl
    ? await callGroupHelpTelegramApi<{ message_id: number }>('sendPhoto', {
        chat_id: chatId,
        photo: input.imageUrl,
        caption: input.message.length <= 1024 ? input.message : `${input.message.slice(0, 1021)}...`
      })
    : await callGroupHelpTelegramApi<{ message_id: number }>('sendMessage', {
        chat_id: chatId,
        text: input.message,
        disable_web_page_preview: true
      });
  const pinned = input.pin
    ? await callGroupHelpTelegramApi('pinChatMessage', {
        chat_id: chatId,
        message_id: sent.message_id,
        disable_notification: true
      })
    : null;
  return { chatId, sent, pinned };
}

function campaignItemData(
  item: z.infer<typeof campaignItemSchema>,
  sortOrder: number
): Prisma.TelegramCampaignItemCreateWithoutCampaignInput {
  return {
    sortOrder,
    kind: item.kind,
    text: item.text,
    imageUrl: item.imageUrl,
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
      const testGroupId = groupConfig.telegramGroupHelpTestGroupChatId?.trim();
      if (!testGroupId) {
        return res.status(400).json({
          message:
            'Test group is not configured. Send /settestgroup in the Telegram test group first.'
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
      const message = await sendCommunityMessage('hopehubai', testGroupId, preview.text, {
        reply_markup: preview.keyboard
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_bots.preview_send',
        targetType: 'telegram_bots',
        targetId: parsed.data.group,
        summary: `Sent ${parsed.data.group} preview to the Telegram test group.`
      });
      res.json({ ok: true, messageId: message.message_id, testGroupId });
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
          select: { bot: true, updateId: true, status: true, error: true, updatedAt: true },
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
      const receiptSummary = (slug: string) => {
        const rows = webhookReceipts.filter((receipt) => receipt.bot === slug);
        const lastFailure = rows.find((receipt) => receipt.status === 'FAILED');
        return {
          processedUpdates: rows.filter((receipt) => receipt.status === 'COMPLETED').length,
          failedUpdates: rows.filter((receipt) => receipt.status === 'FAILED').length,
          lastFailure: lastFailure
            ? { error: lastFailure.error, updatedAt: lastFailure.updatedAt }
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
          receipt.status === 'FAILED' && new Date(receipt.updatedAt).getTime() >= healthCutoff
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
        health: {
          failedWebhookUpdates: recentFailedWebhookUpdates,
          failedDeliveries,
          overdueCampaigns,
          needsAttention:
            failedDeliveries > 0 || overdueCampaigns > 0 || recentFailedWebhookUpdates > 0
        }
      });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const [values, actionHistory] = await Promise.all([
        groupHelpConfigMap(),
        prisma.auditLog.findMany({
          where: {
            targetType: 'telegram_group_help',
            action: {
              in: ['telegram_group_help.action_apply', 'telegram_group_help.action_prepare']
            }
          },
          select: { id: true, action: true, targetId: true, summary: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      ]);
      res.json({
        tokenConfigured: Boolean(groupHelpBotToken()),
        actions: GROUP_HELP_ACTIONS,
        capabilityGroups: GROUP_HELP_CAPABILITY_GROUPS,
        actionHistory,
        config: GROUP_HELP_CONFIG_KEYS.map((key) => ({
          ...GROUP_HELP_CONFIG_META[key],
          value: values[key] ?? GROUP_HELP_CONFIG_DEFAULTS[key] ?? ''
        }))
      });
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

      const updates: Array<{
        key: string;
        value: string;
        meta: (typeof GROUP_HELP_CONFIG_META)[string];
      }> = [];

      for (const entry of parsed.data.entries) {
        const meta = GROUP_HELP_CONFIG_META[entry.key];
        if (!meta) {
          return res.status(400).json({ message: `Unknown Group Help config key: ${entry.key}` });
        }
        const value = entry.value.trim();
        if (value.length > meta.maxLength) {
          return res
            .status(400)
            .json({ message: `${meta.label} is too long. Maximum ${meta.maxLength} characters.` });
        }
        if (meta.type === 'select' && meta.options && !meta.options.includes(value)) {
          return res.status(400).json({ message: `${meta.label} has an unsupported option.` });
        }
        if (meta.type === 'number' && value && !/^\d+$/.test(value)) {
          return res.status(400).json({ message: `${meta.label} must be a whole number.` });
        }
        if (
          ['telegramGroupHelpNightStart', 'telegramGroupHelpNightEnd'].includes(entry.key) &&
          value &&
          !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
        ) {
          return res.status(400).json({ message: `${meta.label} must use HH:MM format.` });
        }
        if (
          entry.key === 'telegramGroupHelpAntiFloodLimit' &&
          value &&
          !/^\d+\s+\d+$/.test(value)
        ) {
          return res
            .status(400)
            .json({ message: 'Anti-flood threshold must use “count seconds”.' });
        }
        updates.push({ key: entry.key, value, meta });
      }

      const saved = await prisma.$transaction(
        updates.map(({ key, value, meta }) =>
          prisma.siteConfig.upsert({
            where: { key },
            create: { key, value, label: meta.label },
            update: { value, label: meta.label }
          })
        )
      );

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_group_help.config_update',
        targetType: 'telegram_group_help',
        targetId: 'config',
        summary: `Updated ${saved.length} Group Help config item(s).`,
        metadata: { keys: saved.map((row) => row.key) }
      });

      const values = await groupHelpConfigMap();
      res.json({
        config: GROUP_HELP_CONFIG_KEYS.map((key) => ({
          ...GROUP_HELP_CONFIG_META[key],
          value: values[key] ?? GROUP_HELP_CONFIG_DEFAULTS[key] ?? ''
        }))
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

      const values = await groupHelpConfigMap();
      const rendered = renderGroupHelpCommand(action, values);
      if (!rendered.raw) return res.status(400).json({ message: `${action.title} is empty.` });

      if (action.applyMode === 'DIRECT_PIN') {
        const result = await sendGroupHelpPost({
          message: rendered.raw,
          imageUrl: rendered.imageUrl || undefined,
          pin: true
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
        summary: `Applied HopeHubAI setting: ${action.title}.`,
        metadata: { mode: 'DATABASE_CONFIG' }
      });
      return res.json({
        ok: true,
        mode: 'APPLIED',
        action,
        message: `${action.title} is active in HopeHubAI.`
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

      let chat: unknown = null;
      let botMembership: unknown = null;
      let chatError: string | null = null;
      if (chatId) {
        try {
          [chat, botMembership] = await Promise.all([
            callGroupHelpTelegramApi('getChat', { chat_id: chatId }),
            callGroupHelpTelegramApi('getChatMember', { chat_id: chatId, user_id: me.id })
          ]);
        } catch (error) {
          chatError = error instanceof Error ? error.message : 'Could not read Telegram chat.';
        }
      }

      res.json({
        tokenConfigured: true,
        ok: true,
        me,
        webhook,
        chat,
        botMembership,
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
          bot: 'rules',
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
      const event = await prisma.telegramCommunityEvent.create({
        data: { ...parsed.data, chatId, createdById: req.user!.id }
      });
      await announceTelegramCommunityEvent(event.id);
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_community_event.create',
        targetType: 'telegram_community_event',
        targetId: event.id,
        summary: `Created Telegram event “${event.title}”.`
      });
      res.status(201).json({ event });
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
      const event = await prisma.telegramCommunityEvent.update({
        where: { id },
        data: {
          ...parsed.data,
          chatId,
          reminderSentAt: null,
          status: 'SCHEDULED'
        }
      });
      await refreshTelegramCommunityEventAnnouncement(event.id);
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
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const submissions = await prisma.telegramCommunitySubmission.findMany({
        where: { bot: 'confession', status: 'pending' },
        select: {
          id: true,
          reference: true,
          serial: true,
          category: true,
          text: true,
          status: true,
          userChatId: true,
          firstName: true,
          username: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' },
        take: 100
      });
      res.json({
        submissions: submissions.map((item) => ({ ...item, serial: item.serial.toString() }))
      });
    })
  );

  router.post(
    '/admin/telegram-bots/group-help/confessions/:reference/review',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const reference = routeParam(req, 'reference');
      const parsed = confessionReviewSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: 'Choose approve or reject.' });
      const submission = await prisma.telegramCommunitySubmission.findUnique({
        where: { reference }
      });
      if (!submission || submission.bot !== 'confession' || submission.status !== 'pending') {
        return res.status(404).json({ message: 'Pending confession not found.' });
      }
      const approved = parsed.data.action === 'APPROVE';
      const destinationNames: string[] = [];
      if (approved) {
        const values = await groupHelpConfigMap();
        if (
          values.telegramCommunityConfessionsInGroup !== 'Disabled' &&
          values.telegramGroupHelpGroupChatId?.trim()
        ) {
          let groupName = 'Hope Hub Community';
          try {
            const group = await callCommunityTelegramApi<{ title?: string; username?: string }>(
              'rules',
              'getChat',
              { chat_id: values.telegramGroupHelpGroupChatId.trim() }
            );
            groupName = group.title || (group.username ? `@${group.username}` : groupName);
          } catch {
            /* Keep the configured fallback display name. */
          }
          await sendCommunityMessage(
            'rules',
            values.telegramGroupHelpGroupChatId.trim(),
            publishedConfessionText({ text: submission.text, destinationName: groupName }),
            {
              message_thread_id: Number(values.telegramCommunityDefaultTopicId) || undefined
            }
          );
          destinationNames.push(groupName);
        }
        const confessionChannel = process.env.TELEGRAM_CONFESSION_CHANNEL_ID?.trim();
        if (confessionChannel) {
          const channelName = await confessionDestinationLabel(confessionChannel);
          await sendCommunityMessage(
            'confession',
            confessionChannel,
            publishedConfessionText({ text: submission.text, destinationName: channelName })
          );
          destinationNames.push(channelName);
        }
      }
      const updated = await prisma.telegramCommunitySubmission.update({
        where: { reference },
        data: { status: approved ? 'approved' : 'rejected' }
      });
      try {
        await sendCommunityMessage(
          'confession',
          submission.userChatId,
          approved
            ? `💙 Your anonymous submission was approved${destinationNames.length ? ` and published in ${destinationNames.join(' and ')}` : ''}.`
            : 'Your submission was not approved for publication at this time.'
        );
      } catch {
        /* The member may have blocked the bot. */
      }
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: approved ? 'telegram_confession.approve' : 'telegram_confession.reject',
        targetType: 'telegram_community_submission',
        targetId: submission.id,
        summary: `${approved ? 'Approved' : 'Rejected'} an anonymous Telegram submission.`
      });
      res.json({
        submission: {
          id: updated.id,
          reference: updated.reference,
          serial: updated.serial.toString(),
          category: updated.category,
          text: updated.text,
          status: updated.status,
          userChatId: updated.userChatId,
          firstName: updated.firstName,
          username: updated.username,
          createdAt: updated.createdAt
        }
      });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help/engagement',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [
        activeCampaigns,
        posts,
        pollVotes,
        reactions,
        newMembers,
        rsvps,
        pendingConfessions,
        failedFollowUps
      ] = await Promise.all([
        prisma.telegramCampaign.count({ where: { isActive: true } }),
        prisma.telegramCampaignDelivery.count({
          where: { status: { in: ['SENT', 'CLOSED'] }, sentAt: { gte: since } }
        }),
        prisma.telegramPollVote.count({ where: { votedAt: { gte: since } } }),
        prisma.telegramCommunityReaction.count({ where: { reactedAt: { gte: since } } }),
        prisma.telegramCommunityMember.count({ where: { joinedAt: { gte: since } } }),
        prisma.telegramCommunityEventRsvp.count({ where: { createdAt: { gte: since } } }),
        prisma.telegramCommunitySubmission.count({
          where: { bot: 'confession', status: 'pending' }
        }),
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
        pendingConfessions,
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
        if (!form.file) return res.status(400).json({ message: 'Choose an image to upload.' });
        if (!GROUP_HELP_IMAGE_MIME_TYPES.has(form.file.mimeType)) {
          return res
            .status(400)
            .json({ message: 'Only JPG, PNG, WebP, and GIF images are allowed.' });
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
          action: 'telegram_group_help.image_upload',
          targetType: 'telegram_group_help_media',
          targetId: saved.storageKey,
          summary: `Uploaded Group Help image "${form.fields['fileName'] || form.file.fileName || saved.storageKey}".`
        });

        res.status(201).json(saved);
      } catch (error) {
        const code = error instanceof Error ? error.message : '';
        if (code === 'UNSUPPORTED_MIME') {
          return res
            .status(400)
            .json({ message: 'Only JPG, PNG, WebP, and GIF images are allowed.' });
        }
        if (code === 'EMPTY_FILE') {
          return res.status(400).json({ message: 'Image file is empty.' });
        }
        if (code === 'FILE_TOO_LARGE') {
          return res.status(400).json({ message: 'Image upload must be 5 MB or smaller.' });
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
        metadata: { bot: 'Hopehubaibot' }
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
