import { Router } from 'express';
import { z } from 'zod';
import { PurchaseOrderStatus } from '@prisma/client';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import {
  getPurchaseOrder,
  listPurchaseOrders,
  postGoodsReceipt,
  PurchaseOrderError
} from '../../services/purchase-orders.js';
import { getStoreStaff, requireManager, storeAuthMiddleware } from './shared.js';

export function registerStorePurchaseOrderRoutes(router: Router) {
  router.get(
    '/purchase-orders',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const status = (req.query['status'] as string) || undefined;
      const orders = await listPurchaseOrders({
        storeId,
        status: status as PurchaseOrderStatus | undefined
      });
      res.json({ orders });
    })
  );

  router.get(
    '/purchase-orders/:id',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const order = await getPurchaseOrder(routeParam(req, 'id'));
      if (!order || order.storeId !== storeId) {
        return res.status(404).json({ message: 'Purchase order not found.' });
      }
      res.json(order);
    })
  );

  router.post(
    '/purchase-orders/:id/grn',
    storeAuthMiddleware,
    requireManager,
    asyncRoute(async (req, res) => {
      const { storeId, staffId } = getStoreStaff(req);
      const body = z
        .object({
          note: z.string().optional(),
          lines: z
            .array(
              z.object({
                purchaseOrderLineId: z.string().min(1),
                qtyReceived: z.number().int().min(1),
                batchNumber: z.string().min(1),
                expiryDate: z.string().min(1),
                purchasePricePerUnit: z.number().int().min(0),
                sellingPricePerUnit: z.number().int().min(0),
                manufacturer: z.string().optional()
              })
            )
            .min(1)
        })
        .parse(req.body);

      try {
        const grn = await postGoodsReceipt({
          purchaseOrderId: routeParam(req, 'id'),
          storeId,
          staffId,
          note: body.note,
          lines: body.lines
        });
        res.status(201).json(grn);
      } catch (error) {
        if (error instanceof PurchaseOrderError) {
          return res.status(400).json({ message: error.message });
        }
        throw error;
      }
    })
  );
}
