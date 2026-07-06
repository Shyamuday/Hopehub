import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, queryText, queryPositiveInt, writeAuditLog } from '../../utils/helpers.js';

export function registerAdminChatRoutes(router: Router) {
  /** List chat sessions — filterable by status. Default: NEEDS_OPERATOR first. */
  router.get(
    '/admin/chat-sessions',
    authRequired,
    allowRoles(Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT_COORDINATOR),
    asyncRoute(async (req, res) => {
      const status = queryText(req, 'status').toUpperCase();
      const page   = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20);

      const where = status && status !== 'ALL'
        ? { status: status as 'ACTIVE' | 'NEEDS_OPERATOR' | 'RESOLVED' }
        : {};

      const total = await prisma.chatSession.count({ where });
      const sessions = await prisma.chatSession.findMany({
        where,
        include: {
          messages: { orderBy: { createdAt: 'asc' }, take: 1 },
          _count: { select: { messages: true } }
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({
        sessions,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  /** Get a single session with all messages. */
  router.get(
    '/admin/chat-sessions/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT_COORDINATOR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const session = await prisma.chatSession.findUnique({
        where: { id },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });
      if (!session) return res.status(404).json({ message: 'Session not found.' });
      res.json({ session });
    })
  );

  /** Resolve a session (mark as handled) and optionally add an operator note. */
  router.patch(
    '/admin/chat-sessions/:id/resolve',
    authRequired,
    allowRoles(Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT_COORDINATOR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const { note } = z.object({ note: z.string().max(1000).optional() }).parse(req.body);

      const session = await prisma.chatSession.update({
        where: { id },
        data: { status: 'RESOLVED', operatorNote: note ?? null, resolvedAt: new Date() }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'chat_session.resolve',
        targetType: 'chat_session',
        targetId: id,
        summary: 'Chat session marked as resolved by operator.'
      });

      res.json({ session, message: 'Session resolved.' });
    })
  );

  /** Send an operator message into a session. */
  router.post(
    '/admin/chat-sessions/:id/message',
    authRequired,
    allowRoles(Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT_COORDINATOR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body);

      const msg = await prisma.chatMessage.create({ data: { sessionId: id, role: 'operator', content } });
      res.status(201).json({ message: msg });
    })
  );
}
