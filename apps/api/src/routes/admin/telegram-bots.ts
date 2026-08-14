import { Router } from 'express';
import { Role, TelegramBotKind } from '@prisma/client';
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

async function safeCommunityWebhookInfo(
  slug: 'contact' | 'confession' | 'rules'
): Promise<WebhookSnapshot | null> {
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

export function registerAdminTelegramBotRoutes(router: Router) {
  router.get(
    '/admin/telegram-bots',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const [sessions, events, webhookInfos, communityWebhookInfos, groupHelpWebhookInfo] =
        await Promise.all([
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
          safeGroupHelpWebhookInfo()
        ]);

      const webhookInfoByKind = Object.fromEntries(webhookInfos);
      const communityWebhookInfoBySlug = Object.fromEntries(communityWebhookInfos);
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
              .length
          }
        };
      });
      const communityBots = communityBotStatus().map((bot) => ({
        ...bot,
        expectedRole: null,
        webhook: communityWebhookInfoBySlug[bot.slug],
        summary: { totalSessions: 0, linkedSessions: 0, activeLinkedSessions: 0 }
      }));
      const groupHelpBot = {
        ...groupHelpBotStatus(),
        expectedRole: null,
        webhook: groupHelpWebhookInfo,
        summary: { totalSessions: 0, linkedSessions: 0, activeLinkedSessions: 0 }
      };

      res.json({
        bots: [...accountBots, ...communityBots, groupHelpBot],
        sessions: sessions.map((session) => ({
          ...session,
          displayName: linkedName(session)
        })),
        events: events.map((event) => ({
          ...event,
          updateId: event.updateId?.toString() ?? null
        }))
      });
    })
  );

  router.get(
    '/admin/telegram-bots/group-help',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const values = await groupHelpConfigMap();
      res.json({
        tokenConfigured: Boolean(groupHelpBotToken()),
        actions: GROUP_HELP_ACTIONS,
        capabilityGroups: GROUP_HELP_CAPABILITY_GROUPS,
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

      const username = (values.telegramGroupHelpBotUsername || 'Hopehubaibot').replace(/^@/, '');
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_group_help.action_prepare',
        targetType: 'telegram_group_help',
        targetId: action.id,
        summary: `Prepared Group Help admin action: ${action.title}.`,
        metadata: { mode: action.applyMode }
      });
      return res.json({
        ok: true,
        mode: 'TELEGRAM_ADMIN_CONFIRMATION',
        action,
        command: rendered.command,
        botUrl: `https://t.me/${encodeURIComponent(username)}`,
        message: 'Command copied. Send it from a Telegram group admin account to apply it.'
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
        callGroupHelpTelegramApi('getMe', {}),
        callGroupHelpTelegramApi('getWebhookInfo', {})
      ]);

      let chat: unknown = null;
      let chatError: string | null = null;
      if (chatId) {
        try {
          chat = await callGroupHelpTelegramApi('getChat', { chat_id: chatId });
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
