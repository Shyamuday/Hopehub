import { Router } from 'express';
import { StockTransferStatus } from '@prisma/client';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import {
  getStockTransfer,
  listStockTransfers,
  receiveStockTransfer,
  StockTransferError
} from '../../services/stock-transfers.js';
import { getStoreStaff, requireManager, storeAuthMiddleware } from './shared.js';

export function registerStoreStockTransferRoutes(router: Router) {
  router.get(
    '/stock-transfers',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const status = (req.query['status'] as string) || undefined;
      const transfers = await listStockTransfers({
        toStoreId: storeId,
        status: status as StockTransferStatus | undefined
      });
      res.json({ transfers });
    })
  );

  router.get(
    '/stock-transfers/:id',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const transfer = await getStockTransfer(routeParam(req, 'id'));
      if (!transfer || transfer.toStoreId !== storeId) {
        return res.status(404).json({ message: 'Transfer not found.' });
      }
      res.json(transfer);
    })
  );

  router.post(
    '/stock-transfers/:id/receive',
    storeAuthMiddleware,
    requireManager,
    asyncRoute(async (req, res) => {
      const { storeId, staffId } = getStoreStaff(req);
      try {
        const transfer = await receiveStockTransfer(routeParam(req, 'id'), storeId, staffId);
        res.json(transfer);
      } catch (error) {
        if (error instanceof StockTransferError) {
          return res.status(400).json({ message: error.message });
        }
        throw error;
      }
    })
  );
}
