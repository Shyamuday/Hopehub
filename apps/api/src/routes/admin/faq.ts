import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

const schema = z.object({
  question: z.string().min(5).max(300),
  answer: z.string().min(5).max(2000),
  category: z.string().min(1).max(80).default('General'),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().min(1).max(999).optional().nullable()
});

export function registerAdminFaqRoutes(router: Router) {
  router.get(
    '/admin/faq',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const entries = await prisma.faqEntry.findMany({
        orderBy: [
          { category: 'asc' },
          { sortOrder: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'asc' }
        ]
      });
      res.json({ entries });
    })
  );

  router.post(
    '/admin/faq',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = schema.parse(req.body);
      const entry = await prisma.faqEntry.create({ data: body });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'faq.create',
        targetType: 'faq',
        targetId: entry.id,
        summary: 'FAQ entry created.'
      });
      res.status(201).json({ entry });
    })
  );

  router.patch(
    '/admin/faq/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = schema.partial().parse(req.body);
      const entry = await prisma.faqEntry.update({ where: { id }, data: body });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'faq.update',
        targetType: 'faq',
        targetId: id,
        summary: 'FAQ entry updated.'
      });
      res.json({ entry });
    })
  );

  router.delete(
    '/admin/faq/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      await prisma.faqEntry.delete({ where: { id } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'faq.delete',
        targetType: 'faq',
        targetId: id,
        summary: 'FAQ entry deleted.'
      });
      res.json({ message: 'FAQ entry deleted.' });
    })
  );
}
