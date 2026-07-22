import { Router } from 'express';
import { Prisma, PublicContentStatus, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';
import { publicPageUpsertSchema } from '../../types/public-pages.js';
import { seedPublicPages } from '../../services/public-pages.js';

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

export function registerAdminPublicPageRoutes(router: Router) {
  router.get(
    '/admin/public-pages',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const pages = await prisma.publicPage.findMany({
        orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }]
      });
      res.json({ pages });
    })
  );

  router.post(
    '/admin/public-pages/seed',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const result = await seedPublicPages();
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'public_page.seed',
        targetType: 'public_page',
        targetId: 'seed',
        summary: `Public pages seeded: ${result.created} created, ${result.updated} updated.`,
        metadata: result
      });
      res.json(result);
    })
  );

  router.post(
    '/admin/public-pages',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = publicPageUpsertSchema.parse(req.body);
      const page = await prisma.publicPage.create({
        data: {
          slug: body.slug,
          title: body.title,
          subtitle: body.subtitle ?? null,
          summary: body.summary ?? null,
          content: jsonValue(body.content),
          seo: jsonValue(body.seo),
          status: body.status ?? PublicContentStatus.DRAFT,
          sortOrder: body.sortOrder ?? 0,
          publishedAt: body.publishedAt ?? (body.status === 'PUBLISHED' ? new Date() : null)
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'public_page.create',
        targetType: 'public_page',
        targetId: page.id,
        summary: `Public page "${page.slug}" created.`
      });
      res.status(201).json({ page });
    })
  );

  router.patch(
    '/admin/public-pages/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = publicPageUpsertSchema.partial({ slug: true }).parse(req.body);
      const status = body.status;
      const page = await prisma.publicPage.update({
        where: { id: routeParam(req, 'id') },
        data: {
          ...(body.slug ? { slug: body.slug } : {}),
          ...(body.title ? { title: body.title } : {}),
          subtitle: body.subtitle,
          summary: body.summary,
          content: body.content === undefined ? undefined : jsonValue(body.content),
          seo: body.seo === undefined ? undefined : jsonValue(body.seo),
          status,
          sortOrder: body.sortOrder,
          publishedAt:
            body.publishedAt !== undefined
              ? body.publishedAt
              : status === 'PUBLISHED'
                ? new Date()
                : undefined
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'public_page.update',
        targetType: 'public_page',
        targetId: page.id,
        summary: `Public page "${page.slug}" updated.`
      });
      res.json({ page });
    })
  );

  router.delete(
    '/admin/public-pages/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const page = await prisma.publicPage.delete({ where: { id } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'public_page.delete',
        targetType: 'public_page',
        targetId: id,
        summary: `Public page "${page.slug}" deleted.`
      });
      res.json({ message: 'Public page deleted.' });
    })
  );
}
