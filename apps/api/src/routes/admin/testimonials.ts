import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

const schema = z.object({
  patientName: z.string().min(2).max(100),
  location: z.string().max(80).optional().nullable(),
  condition: z.string().max(120).optional().nullable(),
  duration: z.string().max(80).optional().nullable(),
  quote: z.string().min(10).max(1200),
  stars: z.number().int().min(1).max(5).default(5),
  isPublished: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  consentToPublish: z.boolean().default(true),
  submitterEmail: z.string().email().max(254).optional().nullable(),
  source: z.string().max(80).optional(),
  sortOrder: z.number().int().min(1).max(999).optional().nullable()
});

export function registerAdminTestimonialRoutes(router: Router) {
  router.get(
    '/admin/testimonials',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const testimonials = await prisma.testimonial.findMany({
        orderBy: [{ sortOrder: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
      });
      res.json({ testimonials });
    })
  );

  router.post(
    '/admin/testimonials',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = schema.parse(req.body);
      const testimonial = await prisma.testimonial.create({
        data: {
          ...body,
          source: body.source || 'admin',
          reviewedAt: body.isPublished ? new Date() : null
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'testimonial.create',
        targetType: 'testimonial',
        targetId: testimonial.id,
        summary: `Testimonial created for "${body.patientName}".`
      });
      res.status(201).json({ testimonial });
    })
  );

  router.patch(
    '/admin/testimonials/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = schema.partial().parse(req.body);
      const testimonial = await prisma.testimonial.update({
        where: { id },
        data: {
          ...body,
          ...(body.isPublished === true ? { reviewedAt: new Date() } : {})
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'testimonial.update',
        targetType: 'testimonial',
        targetId: id,
        summary: 'Testimonial updated.'
      });
      res.json({ testimonial });
    })
  );

  router.delete(
    '/admin/testimonials/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      await prisma.testimonial.delete({ where: { id } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'testimonial.delete',
        targetType: 'testimonial',
        targetId: id,
        summary: 'Testimonial deleted.'
      });
      res.json({ message: 'Testimonial deleted.' });
    })
  );
}
