import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import { createPurchaseOrder, getPurchaseOrder, listPurchaseOrders } from '../../services/purchase-orders.js';

export function registerAdminPurchaseOrderRoutes(router: Router) {
  router.get(
    '/admin/purchase-orders',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const status = queryText(req, 'status') as any;
      const orders = await listPurchaseOrders({
        storeId: queryText(req, 'storeId') || undefined,
        supplierId: queryText(req, 'supplierId') || undefined,
        status: status || undefined
      });
      res.json({ orders });
    })
  );

  router.post(
    '/admin/purchase-orders',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          supplierId: z.string().min(1),
          storeId: z.string().min(1),
          notes: z.string().optional(),
          send: z.boolean().optional().default(true),
          lines: z
            .array(
              z.object({
                medicineId: z.string().min(1),
                qtyOrdered: z.number().int().min(1),
                unitPriceInPaise: z.number().int().min(0)
              })
            )
            .min(1)
        })
        .parse(req.body);

      const order = await createPurchaseOrder({
        ...body,
        createdById: req.user!.id
      });
      res.status(201).json(order);
    })
  );

  router.get(
    '/admin/purchase-orders/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const order = await getPurchaseOrder(routeParam(req, 'id'));
      if (!order) return res.status(404).json({ message: 'Purchase order not found.' });
      res.json(order);
    })
  );
}
