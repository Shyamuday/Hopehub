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

const setupSchema = z.object({
  dropPendingUpdates: z.boolean().optional(),
  publicApiUrl: z.string().url().optional()
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
