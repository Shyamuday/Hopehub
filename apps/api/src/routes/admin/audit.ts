import { Router } from 'express';
import { Role, Prisma } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  asyncRoute,
  queryPositiveInt,
  queryText,
  routeParam,
  writeAuditLog
} from '../../utils/helpers.js';

export function registerAdminAuditRoutes(router: Router) {
  router.get(
    '/admin/audit-retention/stats',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const [total, olderThan30, olderThan90, olderThan365, oldest] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.count({ where: { createdAt: { lt: new Date(now - 30 * day) } } }),
        prisma.auditLog.count({ where: { createdAt: { lt: new Date(now - 90 * day) } } }),
        prisma.auditLog.count({ where: { createdAt: { lt: new Date(now - 365 * day) } } }),
        prisma.auditLog.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } })
      ]);

      res.json({
        total,
        olderThan30Days: olderThan30,
        olderThan90Days: olderThan90,
        olderThan365Days: olderThan365,
        oldestAt: oldest?.createdAt ?? null
      });
    })
  );

  router.post(
    '/admin/audit-retention/purge',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const olderThanDays = Math.max(
        30,
        Number((req.body as { olderThanDays?: number }).olderThanDays) || 90
      );
      const dryRun = Boolean((req.body as { dryRun?: boolean }).dryRun);
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      const where: Prisma.AuditLogWhereInput = { createdAt: { lt: cutoff } };
      const matchCount = await prisma.auditLog.count({ where });

      if (dryRun) {
        return res.json({ dryRun: true, olderThanDays, cutoff, deletedCount: matchCount });
      }

      const result = await prisma.auditLog.deleteMany({ where });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'AUDIT_LOG_PURGE',
        targetType: 'AuditLog',
        targetId: 'bulk',
        summary: `Purged ${result.count} audit logs older than ${olderThanDays} days`,
        metadata: { olderThanDays, cutoff: cutoff.toISOString() }
      });

      res.json({ dryRun: false, olderThanDays, cutoff, deletedCount: result.count });
    })
  );

  router.get(
    '/admin/audit-logs',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const exportType = queryText(req, 'export').toLowerCase();
      const action = queryText(req, 'action').trim();
      const targetType = queryText(req, 'targetType').trim();
      const q = queryText(req, 'q').trim();

      const where: Prisma.AuditLogWhereInput = {
        ...(action ? { action } : {}),
        ...(targetType ? { targetType } : {}),
        ...(q
          ? {
              OR: [
                { action: { contains: q, mode: 'insensitive' } },
                { targetType: { contains: q, mode: 'insensitive' } },
                { targetId: { contains: q, mode: 'insensitive' } },
                { summary: { contains: q, mode: 'insensitive' } },
                { actor: { name: { contains: q, mode: 'insensitive' } } },
                { actor: { email: { contains: q, mode: 'insensitive' } } },
                { actorStoreStaff: { name: { contains: q, mode: 'insensitive' } } },
                { actorStoreStaff: { staffCode: { contains: q, mode: 'insensitive' } } },
                { actorStoreStaff: { email: { contains: q, mode: 'insensitive' } } }
              ]
            }
          : {})
      };

      const total = await prisma.auditLog.count({ where });
      const include = {
        actor: { select: { id: true, name: true, email: true, role: true } },
        actorStoreStaff: {
          select: { id: true, name: true, email: true, staffCode: true, role: true, storeId: true }
        }
      } as const;
      const logs =
        exportType === 'csv'
          ? await prisma.auditLog.findMany({
              where,
              include,
              orderBy: { createdAt: 'desc' },
              take: 10000
            })
          : await prisma.auditLog.findMany({
              where,
              include,
              orderBy: { createdAt: 'desc' },
              skip: (page - 1) * pageSize,
              take: pageSize
            });

      const formatted = logs.map((log) => ({
        id: log.id,
        action: log.action,
        actorRole: log.actorRole,
        actorStoreRole: log.actorStoreRole,
        targetType: log.targetType,
        targetId: log.targetId,
        summary: log.summary,
        metadata: log.metadata,
        createdAt: log.createdAt,
        actor: log.actor
          ? { id: log.actor.id, name: log.actor.name, email: log.actor.email, role: log.actor.role }
          : null,
        actorStoreStaff: log.actorStoreStaff
          ? {
              id: log.actorStoreStaff.id,
              name: log.actorStoreStaff.name,
              email: log.actorStoreStaff.email,
              staffCode: log.actorStoreStaff.staffCode,
              role: log.actorStoreStaff.role,
              storeId: log.actorStoreStaff.storeId
            }
          : null
      }));

      if (exportType === 'csv') {
        const header =
          'createdAt,action,actorName,actorEmail,actorRole,targetType,targetId,summary';
        const rows = formatted.map((log) => {
          const cells = [
            log.createdAt.toISOString(),
            log.action,
            log.actor?.name ?? log.actorStoreStaff?.name ?? '',
            log.actor?.email ?? log.actorStoreStaff?.email ?? log.actorStoreStaff?.staffCode ?? '',
            log.actorRole ??
              log.actor?.role ??
              log.actorStoreRole ??
              log.actorStoreStaff?.role ??
              '',
            log.targetType,
            log.targetId,
            (log.summary ?? '').replace(/"/g, '""')
          ];
          return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
        return res.send([header, ...rows].join('\n'));
      }

      res.json({
        logs: formatted,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.get(
    '/admin/auth-process-logs',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const q = queryText(req, 'q').trim().toLowerCase();
      const status = queryText(req, 'status').trim();
      const reason = queryText(req, 'reason').trim();

      const where: Prisma.AuthProcessLogWhereInput = {
        ...(status ? { status } : {}),
        ...(reason ? { reason } : {}),
        ...(q
          ? {
              OR: [
                { identifier: { contains: q, mode: 'insensitive' } },
                { processType: { contains: q, mode: 'insensitive' } },
                { step: { contains: q, mode: 'insensitive' } },
                { reason: { contains: q, mode: 'insensitive' } },
                { route: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const [total, logs] = await Promise.all([
        prisma.authProcessLog.count({ where }),
        prisma.authProcessLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      res.json({
        page,
        pageSize,
        total,
        logs
      });
    })
  );

  router.get(
    '/admin/auth-sessions',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const q = queryText(req, 'q').trim();
      const status = queryText(req, 'status').trim();
      const now = new Date();
      const roleQuery = Object.values(Role).includes(q.toUpperCase() as Role)
        ? (q.toUpperCase() as Role)
        : null;

      const where: Prisma.AuthSessionWhereInput = {
        ...(status === 'active'
          ? { revokedAt: null, expiresAt: { gt: now } }
          : status === 'revoked'
            ? { revokedAt: { not: null } }
            : status === 'expired'
              ? { expiresAt: { lte: now } }
              : {}),
        ...(q
          ? {
              OR: [
                { user: { name: { contains: q, mode: 'insensitive' } } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                ...(roleQuery ? [{ user: { role: { equals: roleQuery } } }] : []),
                { ipAddress: { contains: q, mode: 'insensitive' } },
                { userAgent: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const [total, sessions] = await Promise.all([
        prisma.authSession.count({ where }),
        prisma.authSession.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            user: { select: { id: true, name: true, email: true, role: true, isActive: true } }
          }
        })
      ]);

      res.json({
        page,
        pageSize,
        total,
        sessions: sessions.map((session) => ({
          id: session.id,
          userId: session.userId,
          user: session.user,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          expiresAt: session.expiresAt,
          revokedAt: session.revokedAt,
          lastUsedAt: session.lastUsedAt,
          createdAt: session.createdAt,
          status: session.revokedAt ? 'revoked' : session.expiresAt <= now ? 'expired' : 'active'
        }))
      });
    })
  );

  router.patch(
    '/admin/auth-sessions/:id/revoke',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const sessionId = routeParam(req, 'id');
      const session = await prisma.authSession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
        include: { user: { select: { id: true, name: true, email: true, role: true } } }
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'AUTH_SESSION_REVOKE',
        targetType: 'AuthSession',
        targetId: session.id,
        summary: `Revoked auth session for ${session.user.email || session.user.name}.`,
        metadata: { userId: session.userId, role: session.user.role }
      });

      res.json({ session: { id: session.id, revokedAt: session.revokedAt } });
    })
  );

  router.patch(
    '/admin/users/:id/auth-sessions/revoke',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const userId = routeParam(req, 'id');
      const result = await prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'AUTH_SESSION_REVOKE_USER',
        targetType: 'User',
        targetId: userId,
        summary: `Revoked ${result.count} active auth sessions for user.`,
        metadata: { count: result.count }
      });

      res.json({ revokedCount: result.count });
    })
  );
}
