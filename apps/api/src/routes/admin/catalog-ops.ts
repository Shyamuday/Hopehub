import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryPositiveInt, queryText, routeParam } from '../../utils/helpers.js';

const supplierBodySchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional()
});

const medicineBodySchema = z.object({
  name: z.string().min(2),
  shortName: z.string().optional(),
  alternateName: z.string().optional(),
  manufacturer: z.string().optional(),
  potency: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  minStockLevel: z.number().int().min(0).default(10),
  barcode: z.string().optional(),
  isActive: z.boolean().optional()
});

export function registerAdminCatalogOpsRoutes(router: Router) {
  router.get(
    '/admin/suppliers',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const includeInactive = queryText(req, 'includeInactive') === 'true';
      const suppliers = await prisma.supplier.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: { name: 'asc' }
      });
      res.json({ suppliers });
    })
  );

  router.post(
    '/admin/suppliers',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = supplierBodySchema.parse(req.body);
      const code = body.code.toUpperCase();
      const existing = await prisma.supplier.findUnique({ where: { code } });
      if (existing) {
        return res.status(409).json({ message: 'Supplier code already exists.' });
      }

      const supplier = await prisma.supplier.create({
        data: {
          code,
          name: body.name,
          email: body.email || null,
          phone: body.phone || null,
          address: body.address || null,
          gstin: body.gstin || null
        }
      });
      res.status(201).json({ supplier });
    })
  );

  router.patch(
    '/admin/suppliers/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = supplierBodySchema
        .partial()
        .extend({ isActive: z.boolean().optional() })
        .parse(req.body);
      const supplier = await prisma.supplier.update({
        where: { id: routeParam(req, 'id') },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.email !== undefined ? { email: body.email || null } : {}),
          ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
          ...(body.address !== undefined ? { address: body.address || null } : {}),
          ...(body.gstin !== undefined ? { gstin: body.gstin || null } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {})
        }
      });
      res.json({ supplier });
    })
  );

  router.get(
    '/admin/medicines',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const q = queryText(req, 'q').trim();
      const includeInactive = queryText(req, 'includeInactive') === 'true';
      const page = queryPositiveInt(req, 'page', 1, 1, 100);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 50);

      const where = {
        ...(includeInactive ? {} : { isActive: true }),
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
          orderBy: { name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      res.json({ medicines, pagination: { page, pageSize, total } });
    })
  );

  router.post(
    '/admin/medicines',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = medicineBodySchema.parse(req.body);
      const qrCode = `VTLS-MED-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      const medicine = await prisma.storeMedicine.create({
        data: { ...body, qrCode }
      });
      res.status(201).json({ medicine });
    })
  );

  router.put(
    '/admin/medicines/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = medicineBodySchema.parse(req.body);
      const medicine = await prisma.storeMedicine.update({
        where: { id: routeParam(req, 'id') },
        data: body
      });
      res.json({ medicine });
    })
  );
}
