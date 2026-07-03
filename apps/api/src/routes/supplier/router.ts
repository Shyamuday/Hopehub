import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import {
  getPurchaseOrder,
  listPurchaseOrders,
  resolveSupplierId,
  supplierConfirmPurchaseOrder
} from '../../services/purchase-orders.js';
import { prisma } from '../../db.js';

const supplierRoles = [Role.SUPPLIER, Role.ADMIN] as const;

export function createSupplierRouter() {
  const router = Router();

  router.get(
    '/supplier/me',
    authRequired,
    allowRoles(...supplierRoles),
    asyncRoute(async (req, res) => {
      const supplierId = await resolveSupplierId(req.user!.id, req.user!.role);
      const profile = await prisma.supplierProfile.findUnique({
        where: { userId: req.user!.id },
        include: { supplier: true }
      });
      res.json({ user: req.user, supplierId, profile, supplier: profile?.supplier ?? null });
    })
  );

  router.get(
    '/supplier/purchase-orders',
    authRequired,
    allowRoles(...supplierRoles),
    asyncRoute(async (req, res) => {
      const supplierId = await resolveSupplierId(req.user!.id, req.user!.role);
      if (req.user!.role === Role.SUPPLIER && !supplierId) {
        return res.status(400).json({ message: 'Supplier profile not found.' });
      }
      const status = queryText(req, 'status') as any;
      const orders = await listPurchaseOrders({
        supplierId: supplierId ?? (queryText(req, 'supplierId') || undefined),
        status: status || undefined
      });
      res.json({ orders });
    })
  );

  router.get(
    '/supplier/purchase-orders/:id',
    authRequired,
    allowRoles(...supplierRoles),
    asyncRoute(async (req, res) => {
      const supplierId = await resolveSupplierId(req.user!.id, req.user!.role);
      const order = await getPurchaseOrder(routeParam(req, 'id'));
      if (!order) return res.status(404).json({ message: 'Purchase order not found.' });
      if (req.user!.role === Role.SUPPLIER && order.supplierId !== supplierId) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      res.json(order);
    })
  );

  router.post(
    '/supplier/purchase-orders/:id/confirm',
    authRequired,
    allowRoles(...supplierRoles),
    asyncRoute(async (req, res) => {
      const supplierId = await resolveSupplierId(req.user!.id, req.user!.role);
      if (!supplierId && req.user!.role === Role.SUPPLIER) {
        return res.status(400).json({ message: 'Supplier profile not found.' });
      }
      const body = z
        .object({
          supplierNotes: z.string().optional(),
          expectedDeliveryDate: z.string().optional()
        })
        .parse(req.body);

      const order = await getPurchaseOrder(routeParam(req, 'id'));
      if (!order) return res.status(404).json({ message: 'Purchase order not found.' });
      const effectiveSupplierId =
        req.user!.role === Role.ADMIN ? order.supplierId : supplierId!;

      const updated = await supplierConfirmPurchaseOrder(
        routeParam(req, 'id'),
        effectiveSupplierId,
        body
      );
      res.json(updated);
    })
  );

  return router;
}
