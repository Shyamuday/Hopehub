import { Router } from 'express';
import { Role, TelegramBotKind } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';
import {
  getTelegramWebhookInfo,
  setTelegramCommands,
  setTelegramWebhook,
  telegramBotStatus
} from '../../services/telegram-bots.client.js';
import { roleByKind } from '../../services/telegram-bots.config.js';
import { telegramBotKindFromSlug } from '../../services/telegram-bots.menus.js';
import {
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
  pin: z.boolean().optional()
});

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

function linkedName(session: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}) {
  const name = [session.firstName, session.lastName].filter(Boolean).join(' ').trim();
  return name || (session.username ? `@${session.username}` : 'Telegram user');
}

function groupHelpBotToken() {
  return process.env.TELEGRAM_GROUP_HELP_BOT_TOKEN?.trim() || '';
}

async function callGroupHelpTelegramApi<T>(method: string, payload: unknown): Promise<T> {
  const token = groupHelpBotToken();
  if (!token) throw new Error('TELEGRAM_GROUP_HELP_BOT_TOKEN is not configured.');

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

async function groupHelpConfigMap() {
  const rows = await prisma.siteConfig.findMany({
    where: { key: { in: GROUP_HELP_CONFIG_KEYS } }
  });
  return {
    ...GROUP_HELP_CONFIG_DEFAULTS,
    ...Object.fromEntries(rows.map((row) => [row.key, row.value]))
  };
}

export function registerAdminTelegramBotRoutes(router: Router) {
  router.get(
    '/admin/telegram-bots',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const [sessions, events, webhookInfos] = await Promise.all([
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
        )
      ]);

      const webhookInfoByKind = Object.fromEntries(webhookInfos);
      const bots = telegramBotStatus().map((bot) => {
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

      res.json({
        bots,
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
    allowRoles(Role.ADMIN),
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
    '/admin/telegram-bots/group-help/send',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const parsed = groupHelpSendSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid Group Help send payload.' });
      }

      const values = await groupHelpConfigMap();
      const chatId = values.telegramGroupHelpGroupChatId?.trim();
      if (!groupHelpBotToken()) {
        return res
          .status(400)
          .json({ message: 'TELEGRAM_GROUP_HELP_BOT_TOKEN is not configured.' });
      }
      if (!chatId) {
        return res.status(400).json({ message: 'Telegram group chat ID is not configured.' });
      }

      const sent = await callGroupHelpTelegramApi<{ message_id: number }>('sendMessage', {
        chat_id: chatId,
        text: parsed.data.message,
        disable_web_page_preview: true
      });

      let pinned: unknown = null;
      if (parsed.data.pin) {
        pinned = await callGroupHelpTelegramApi('pinChatMessage', {
          chat_id: chatId,
          message_id: sent.message_id,
          disable_notification: true
        });
      }

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
        metadata: { chatId, messageId: sent.message_id, pin: Boolean(parsed.data.pin) }
      });

      res.json({ ok: true, message: sent, pinned });
    })
  );

  router.post(
    '/admin/telegram-bots/:bot/setup',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const slug = routeParam(req, 'bot');
      const kind = telegramBotKindFromSlug(slug);
      if (!kind) return res.status(404).json({ message: 'Unknown Telegram bot.' });

      const parsed = setupSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid Telegram setup payload.' });
      }

      await setTelegramCommands(kind);
      const webhook = await setTelegramWebhook({
        kind,
        dropPendingUpdates: parsed.data.dropPendingUpdates,
        publicApiUrl: parsed.data.publicApiUrl
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_bot.setup',
        targetType: 'telegram_bot',
        targetId: kind,
        summary: `Updated Telegram commands and webhook for ${slug} bot.`,
        metadata: { slug, dropPendingUpdates: Boolean(parsed.data.dropPendingUpdates) }
      });

      res.json({ ok: true, webhook });
    })
  );

  router.post(
    '/admin/telegram-bots/setup-all',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const parsed = setupSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid Telegram setup payload.' });
      }

      const results = await Promise.all(
        Object.values(TelegramBotKind).map(async (kind) => {
          await setTelegramCommands(kind);
          const webhook = await setTelegramWebhook({
            kind,
            dropPendingUpdates: parsed.data.dropPendingUpdates,
            publicApiUrl: parsed.data.publicApiUrl
          });
          return { kind, webhook };
        })
      );

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'telegram_bot.setup_all',
        targetType: 'telegram_bot',
        targetId: 'all',
        summary: 'Updated Telegram commands and webhooks for all configured bots.',
        metadata: { dropPendingUpdates: Boolean(parsed.data.dropPendingUpdates) }
      });

      res.json({ ok: true, results });
    })
  );

  router.post(
    '/admin/telegram-bots/sessions/:id/unlink',
    authRequired,
    allowRoles(Role.ADMIN),
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
