import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncRoute, queryPositiveInt, routeParam } from '../../utils/helpers.js';
import { formatInAppNotification } from '../../services/in-app-notifications.js';
import { getStoreStaff, storeAuthMiddleware } from './shared.js';
import { registerStoreStaffPushDevice } from '../../services/push-devices.js';

export function registerStoreNotificationRoutes(router: Router) {
  router.post(
    '/push-token',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          token: z.string().min(1),
          platform: z.enum(['ios', 'android', 'web']).optional()
        })
        .parse(req.body);
      const { staffId } = getStoreStaff(req);
      await registerStoreStaffPushDevice({
        storeStaffId: staffId,
        token: body.token,
        platform: body.platform
      });
      res.json({ ok: true, token: body.token.slice(0, 8) + '…' });
    })
  );
  router.get(
    '/notifications/unread-count',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { staffId } = getStoreStaff(req);
      const count = await prisma.inAppNotification.count({
        where: { recipientStoreStaffId: staffId, readAt: null }
      });
      res.json({ count });
    })
  );

  router.get(
    '/notifications',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { staffId } = getStoreStaff(req);
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const unreadOnly = String(req.query['unreadOnly'] ?? '').toLowerCase() === 'true';

      const where = {
        recipientStoreStaffId: staffId,
        ...(unreadOnly ? { readAt: null } : {})
      };

      const total = await prisma.inAppNotification.count({ where });
      const rows = await prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({
        notifications: rows.map(formatInAppNotification),
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.patch(
    '/notifications/:id/read',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { staffId } = getStoreStaff(req);
      const id = routeParam(req, 'id');
      const updated = await prisma.inAppNotification.updateMany({
        where: { id, recipientStoreStaffId: staffId, readAt: null },
        data: { readAt: new Date() }
      });
      if (!updated.count) {
        return res.status(404).json({ message: 'Notification not found.' });
      }
      res.json({ ok: true });
    })
  );

  router.post(
    '/notifications/read-all',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { staffId } = getStoreStaff(req);
      const result = await prisma.inAppNotification.updateMany({
        where: { recipientStoreStaffId: staffId, readAt: null },
        data: { readAt: new Date() }
      });
      res.json({ updated: result.count });
    })
  );
}
