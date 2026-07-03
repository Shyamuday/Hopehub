import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryPositiveInt, queryText } from '../../utils/helpers.js';

export function registerAdminCatalogOpsRoutes(router: Router) {
  router.get(
    '/admin/suppliers',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const suppliers = await prisma.supplier.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true, email: true, phone: true },
        orderBy: { name: 'asc' }
      });
      res.json({ suppliers });
    })
  );

  router.get(
    '/admin/medicines',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const q = queryText(req, 'q').trim();
      const page = queryPositiveInt(req, 'page', 1, 1, 100);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 50);

      const where = {
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { shortName: { contains: q, mode: 'insensitive' as const } },
                { potency: { contains: q, mode: 'insensitive' as const } },
                { manufacturer: { contains: q, mode: 'insensitive' as const } }
              ]
            }
          : {})
      };

      const [total, medicines] = await Promise.all([
        prisma.storeMedicine.count({ where }),
        prisma.storeMedicine.findMany({
          where,
          select: { id: true, name: true, potency: true, manufacturer: true, category: true },
          orderBy: { name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      res.json({ medicines, pagination: { page, pageSize, total } });
    })
  );
}
