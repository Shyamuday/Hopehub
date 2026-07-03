import { Router } from 'express';
import { z } from 'zod';
import { Role, StockTransferStatus } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import {
  createStockTransfer,
  dispatchStockTransfer,
  getStockTransfer,
  getWarehouseDashboard,
  listStockTransfers,
  resolveWarehouseStoreId
} from '../../services/stock-transfers.js';
import { prisma } from '../../db.js';

const warehouseRoles = [Role.WAREHOUSE_MANAGER, Role.ADMIN] as const;

export function createWarehouseRouter() {
  const router = Router();

  router.get(
    '/warehouse/me',
    authRequired,
    allowRoles(...warehouseRoles),
    asyncRoute(async (req, res) => {
      const warehouseId = await resolveWarehouseStoreId(req.user!.id, req.user!.role);
      const profile = await prisma.warehouseManagerProfile.findUnique({
        where: { userId: req.user!.id },
        include: { warehouse: { select: { id: true, name: true, code: true, kind: true, address: true } } }
      });
      res.json({ user: req.user, warehouseId, profile, warehouse: profile?.warehouse ?? null });
    })
  );

  router.get(
    '/warehouse/dashboard',
    authRequired,
    allowRoles(...warehouseRoles),
    asyncRoute(async (req, res) => {
      const warehouseId = await resolveWarehouseStoreId(req.user!.id, req.user!.role);
      const effectiveId =
        warehouseId ?? (queryText(req, 'warehouseId') || undefined);
      if (!effectiveId) {
        return res.status(400).json({ message: 'Warehouse selection is required for admin users.' });
      }
      res.json(await getWarehouseDashboard(effectiveId));
    })
  );

  router.get(
    '/warehouse/branches',
    authRequired,
    allowRoles(...warehouseRoles),
    asyncRoute(async (_req, res) => {
      const branches = await prisma.store.findMany({
        where: { kind: 'BRANCH', isActive: true },
        select: { id: true, name: true, code: true, address: true },
        orderBy: { name: 'asc' }
      });
      res.json({ branches });
    })
  );

  router.get(
    '/warehouse/transfers',
    authRequired,
    allowRoles(...warehouseRoles),
    asyncRoute(async (req, res) => {
      const warehouseId = await resolveWarehouseStoreId(req.user!.id, req.user!.role);
      const status = queryText(req, 'status') as StockTransferStatus | undefined;
      const transfers = await listStockTransfers({
        fromStoreId: warehouseId ?? (queryText(req, 'warehouseId') || undefined),
        status: status || undefined
      });
      res.json({ transfers });
    })
  );

  router.post(
    '/warehouse/transfers',
    authRequired,
    allowRoles(...warehouseRoles),
    asyncRoute(async (req, res) => {
      const warehouseId = await resolveWarehouseStoreId(req.user!.id, req.user!.role);
      const body = z
        .object({
          toStoreId: z.string().min(1),
          notes: z.string().optional(),
          warehouseId: z.string().optional(),
          lines: z
            .array(
              z.object({
                medicineId: z.string().min(1),
                qtyRequested: z.number().int().min(1)
              })
            )
            .min(1)
        })
        .parse(req.body);

      const fromStoreId = warehouseId ?? body.warehouseId;
      if (!fromStoreId) {
        return res.status(400).json({ message: 'Warehouse selection is required.' });
      }

      const transfer = await createStockTransfer({
        fromStoreId,
        toStoreId: body.toStoreId,
        notes: body.notes,
        createdById: req.user!.id,
        lines: body.lines
      });
      res.status(201).json(transfer);
    })
  );

  router.get(
    '/warehouse/transfers/:id',
    authRequired,
    allowRoles(...warehouseRoles),
    asyncRoute(async (req, res) => {
      const warehouseId = await resolveWarehouseStoreId(req.user!.id, req.user!.role);
      const transfer = await getStockTransfer(routeParam(req, 'id'));
      if (!transfer) return res.status(404).json({ message: 'Transfer not found.' });
      if (req.user!.role === Role.WAREHOUSE_MANAGER && transfer.fromStoreId !== warehouseId) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      res.json(transfer);
    })
  );

  router.post(
    '/warehouse/transfers/:id/dispatch',
    authRequired,
    allowRoles(...warehouseRoles),
    asyncRoute(async (req, res) => {
      const warehouseId = await resolveWarehouseStoreId(req.user!.id, req.user!.role);
      if (!warehouseId && req.user!.role === Role.WAREHOUSE_MANAGER) {
        return res.status(400).json({ message: 'Warehouse profile not found.' });
      }
      const transfer = await getStockTransfer(routeParam(req, 'id'));
      if (!transfer) return res.status(404).json({ message: 'Transfer not found.' });
      const effectiveWarehouseId =
        warehouseId ?? transfer.fromStoreId;

      const body = z
        .object({
          lines: z
            .array(
              z.object({
                transferLineId: z.string().min(1),
                qtyDispatched: z.number().int().min(1),
                sourceBatchId: z.string().min(1)
              })
            )
            .min(1)
        })
        .parse(req.body);

      const updated = await dispatchStockTransfer(routeParam(req, 'id'), effectiveWarehouseId, body.lines);
      res.json(updated);
    })
  );

  return router;
}
