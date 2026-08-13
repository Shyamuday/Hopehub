import { Router } from 'express';
import { Role, Prisma, StockStatus } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryPositiveInt, queryText, routeParam } from '../../utils/helpers.js';

export function registerAdminInventoryRoutes(router: Router) {
  router.get(
    '/admin/inventory/overview',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const stores = await prisma.store.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true, kind: true },
        orderBy: { name: 'asc' }
      });

      const stockAgg = await prisma.medicineStock.groupBy({
        by: ['storeId', 'status'],
        _count: { _all: true },
        _sum: { currentQty: true }
      });

      const byStore = new Map<
        string,
        { skuCount: number; lowStockCount: number; outOfStockCount: number; totalQty: number }
      >();

      for (const row of stockAgg) {
        const current = byStore.get(row.storeId) ?? {
          skuCount: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          totalQty: 0
        };
        current.skuCount += row._count._all;
        current.totalQty += row._sum.currentQty ?? 0;
        if (row.status === StockStatus.LOW_STOCK) current.lowStockCount += row._count._all;
        if (row.status === StockStatus.OUT_OF_STOCK) current.outOfStockCount += row._count._all;
        byStore.set(row.storeId, current);
      }

      res.json({
        stores: stores.map((store) => ({
          ...store,
          ...(byStore.get(store.id) ?? {
            skuCount: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            totalQty: 0
          })
        }))
      });
    })
  );

  router.get(
    '/admin/inventory/stores/:storeId/stock',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const storeId = routeParam(req, 'storeId');
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 50, 1, 200);
      const status = queryText(req, 'status').trim().toUpperCase();
      const q = queryText(req, 'q').trim();

      const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, name: true, code: true, kind: true }
      });
      if (!store) {
        return res.status(404).json({ message: 'Store not found.' });
      }

      const where: Prisma.MedicineStockWhereInput = {
        storeId,
        ...(status && Object.values(StockStatus).includes(status as StockStatus)
          ? { status: status as StockStatus }
          : {}),
        ...(q
          ? {
              medicine: {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { potency: { contains: q, mode: 'insensitive' } },
                  { manufacturer: { contains: q, mode: 'insensitive' } }
                ]
              }
            }
          : {})
      };

      const total = await prisma.medicineStock.count({ where });
      const stocks = await prisma.medicineStock.findMany({
        where,
        include: {
          medicine: {
            select: {
              id: true,
              name: true,
              potency: true,
              manufacturer: true,
              minStockLevel: true,
              isActive: true
            }
          },
          rack: { select: { rackCode: true, shelfCode: true, boxCode: true } }
        },
        orderBy: [{ status: 'asc' }, { currentQty: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({
        store,
        stocks: stocks.map((stock) => ({
          id: stock.id,
          currentQty: stock.currentQty,
          status: stock.status,
          shortfall: Math.max(0, stock.medicine.minStockLevel - stock.currentQty),
          medicine: stock.medicine,
          rack: stock.rack
            ? {
                locationString: `${stock.rack.rackCode}-${stock.rack.shelfCode}-${stock.rack.boxCode}`
              }
            : null
        })),
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );
}
