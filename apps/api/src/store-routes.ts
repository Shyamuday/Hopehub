import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { StockMovementType, StockStatus } from '@prisma/client';
import { prisma } from './db.js';

export const storeRouter = express.Router();

const STORE_JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret';
const STORE_TOKEN_EXPIRY = '12h';

type StoreTokenPayload = {
  staffId: string;
  storeId: string;
  role: 'MANAGER' | 'STAFF';
  name: string;
};

function signStoreToken(payload: StoreTokenPayload) {
  return jwt.sign(payload, STORE_JWT_SECRET, { expiresIn: STORE_TOKEN_EXPIRY });
}

function asyncRoute(
  handler: express.RequestHandler
): express.RequestHandler {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}

async function storeAuthMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ message: 'Store authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, STORE_JWT_SECRET) as StoreTokenPayload;
    (req as express.Request & { storeStaff?: StoreTokenPayload }).storeStaff = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired store token.' });
  }
}

function requireManager(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const staff = (req as express.Request & { storeStaff?: StoreTokenPayload }).storeStaff;
  if (staff?.role !== 'MANAGER') {
    return res.status(403).json({ message: 'Manager access required.' });
  }

  next();
}

function getStoreStaff(req: express.Request): StoreTokenPayload {
  return (req as express.Request & { storeStaff?: StoreTokenPayload }).storeStaff!;
}

function computeStockStatus(qty: number, minStockLevel: number): StockStatus {
  if (qty === 0) return StockStatus.OUT_OF_STOCK;
  if (qty < minStockLevel) return StockStatus.LOW_STOCK;
  return StockStatus.ACTIVE;
}

function daysUntilExpiry(expiryDate: Date) {
  return Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function enrichBatch(batch: { expiryDate: Date; [key: string]: unknown }) {
  const days = daysUntilExpiry(batch.expiryDate);
  return {
    ...batch,
    daysToExpiry: days,
    isExpired: days <= 0,
    isExpiringSoon: days > 0 && days <= 60
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

storeRouter.post(
  '/auth/login',
  asyncRoute(async (req, res) => {
    const body = z
      .object({ staffCode: z.string().min(1), pin: z.string().min(4).max(8) })
      .parse(req.body);

    const staff = await prisma.storeStaff.findUnique({
      where: { staffCode: body.staffCode },
      include: { store: { select: { id: true, name: true } } }
    });

    if (!staff || !staff.isActive) {
      return res.status(401).json({ message: 'Invalid staff code or PIN.' });
    }

    const isValid = await bcrypt.compare(body.pin, staff.pinHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid staff code or PIN.' });
    }

    const token = signStoreToken({
      staffId: staff.id,
      storeId: staff.storeId,
      role: staff.role as 'MANAGER' | 'STAFF',
      name: staff.name
    });

    res.json({
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        staffCode: staff.staffCode,
        storeId: staff.storeId,
        storeName: staff.store.name
      }
    });
  })
);

storeRouter.post(
  '/auth/manager-login',
  asyncRoute(async (req, res) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);

    // Manager uses the existing platform user (ADMIN role) with store staff record
    const staff = await prisma.storeStaff.findFirst({
      where: { role: 'MANAGER', isActive: true },
      include: { store: { select: { id: true, name: true } } }
    });

    if (!staff) {
      return res.status(401).json({ message: 'No manager account found.' });
    }

    const isValid = await bcrypt.compare(body.password, staff.pinHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signStoreToken({
      staffId: staff.id,
      storeId: staff.storeId,
      role: 'MANAGER',
      name: staff.name
    });

    res.json({
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        staffCode: staff.staffCode,
        storeId: staff.storeId,
        storeName: staff.store.name
      }
    });
  })
);

storeRouter.get(
  '/auth/staff-list',
  asyncRoute(async (req, res) => {
    const storeCode = req.query['store'] as string | undefined;
    const store = storeCode
      ? await prisma.store.findUnique({ where: { code: storeCode }, select: { id: true } })
      : await prisma.store.findFirst({ where: { isActive: true }, select: { id: true } });

    if (!store) {
      return res.json({ staff: [] });
    }

    const staff = await prisma.storeStaff.findMany({
      where: { storeId: store.id, isActive: true, role: 'STAFF' },
      select: { id: true, name: true, staffCode: true, role: true }
    });

    res.json({ staff });
  })
);

// ─── Medicines ────────────────────────────────────────────────────────────────

storeRouter.get(
  '/medicines',
  storeAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);
    const q = (req.query['q'] as string || '').trim().toLowerCase();
    const potency = (req.query['potency'] as string || '').trim();
    const statusFilter = req.query['status'] as string | undefined;
    const page = Math.max(1, Number(req.query['page']) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(req.query['pageSize']) || 20));

    const where = {
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { shortName: { contains: q, mode: 'insensitive' as const } },
              { alternateName: { contains: q, mode: 'insensitive' as const } },
              { manufacturer: { contains: q, mode: 'insensitive' as const } },
              { category: { contains: q, mode: 'insensitive' as const } },
              { barcode: { contains: q, mode: 'insensitive' as const } }
            ]
          }
        : {}),
      ...(potency ? { potency: { contains: potency, mode: 'insensitive' as const } } : {})
    };

    const total = await prisma.storeMedicine.count({ where });
    const medicines = await prisma.storeMedicine.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        stocks: {
          where: { storeId },
          include: {
            rack: true,
            batches: { orderBy: { expiryDate: 'asc' }, take: 1 }
          }
        }
      }
    });

    const result = medicines.map((m) => {
      const stock = m.stocks[0] || null;
      const stockStatus = stock
        ? statusFilter && stock.status !== statusFilter ? null : stock.status
        : 'OUT_OF_STOCK';

      if (statusFilter && stock?.status !== statusFilter) return null;

      return {
        id: m.id,
        name: m.name,
        shortName: m.shortName,
        potency: m.potency,
        manufacturer: m.manufacturer,
        category: m.category,
        minStockLevel: m.minStockLevel,
        qrCode: m.qrCode,
        barcode: m.barcode,
        currentQty: stock?.currentQty ?? 0,
        status: stockStatus ?? 'OUT_OF_STOCK',
        stockId: stock?.id ?? null,
        rack: stock?.rack
          ? {
              id: stock.rack.id,
              rackCode: stock.rack.rackCode,
              shelfCode: stock.rack.shelfCode,
              boxCode: stock.rack.boxCode,
              label: stock.rack.label,
              potencyColor: stock.rack.potencyColor,
              locationString: `${stock.rack.rackCode}-${stock.rack.shelfCode}-${stock.rack.boxCode}`
            }
          : null,
        nearestExpiry: stock?.batches[0]
          ? enrichBatch(stock.batches[0] as { expiryDate: Date; [key: string]: unknown })
          : null
      };
    }).filter(Boolean);

    res.json({
      medicines: result,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  })
);

storeRouter.get(
  '/medicines/:id',
  storeAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);
    const medicineId = req.params['id'] as string;
    const medicine = await prisma.storeMedicine.findUnique({
      where: { id: medicineId },
      include: {
        stocks: {
          where: { storeId },
          include: {
            rack: true,
            batches: { orderBy: { expiryDate: 'asc' } }
          }
        }
      }
    });

    if (!medicine) return res.status(404).json({ message: 'Medicine not found.' });

    const stock = medicine.stocks[0] || null;
    res.json({
      medicine: {
        ...medicine,
        stocks: undefined,
        currentQty: stock?.currentQty ?? 0,
        status: stock?.status ?? 'OUT_OF_STOCK',
        stockId: stock?.id ?? null,
        rack: stock?.rack
          ? {
              ...stock.rack,
              locationString: `${stock.rack.rackCode}-${stock.rack.shelfCode}-${stock.rack.boxCode}`
            }
          : null,
        batches: (stock?.batches ?? []).map((b: { expiryDate: Date; [key: string]: unknown }) =>
          enrichBatch(b)
        )
      }
    });
  })
);

storeRouter.post(
  '/medicines',
  storeAuthMiddleware,
  requireManager,
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        shortName: z.string().optional(),
        alternateName: z.string().optional(),
        manufacturer: z.string().optional(),
        potency: z.string().min(1),
        category: z.string().optional(),
        description: z.string().optional(),
        minStockLevel: z.number().int().min(0).default(10),
        barcode: z.string().optional()
      })
      .parse(req.body);

    const qrCode = `VTLS-MED-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const medicine = await prisma.storeMedicine.create({
      data: { ...body, qrCode }
    });

    const { storeId } = getStoreStaff(req);
    await prisma.medicineStock.create({
      data: {
        medicineId: medicine.id,
        storeId,
        currentQty: 0,
        status: StockStatus.OUT_OF_STOCK
      }
    });

    res.status(201).json({ medicine });
  })
);

storeRouter.put(
  '/medicines/:id',
  storeAuthMiddleware,
  requireManager,
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        shortName: z.string().optional(),
        alternateName: z.string().optional(),
        manufacturer: z.string().optional(),
        potency: z.string().min(1),
        category: z.string().optional(),
        description: z.string().optional(),
        minStockLevel: z.number().int().min(0),
        barcode: z.string().optional(),
        isActive: z.boolean().optional()
      })
      .parse(req.body);

    const medicine = await prisma.storeMedicine.update({
      where: { id: req.params['id'] as string },
      data: body
    });

    res.json({ medicine });
  })
);

// ─── Racks ────────────────────────────────────────────────────────────────────

storeRouter.get(
  '/racks',
  storeAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);
    const racks = await prisma.storeRack.findMany({
      where: { storeId },
      include: {
        stocks: {
          include: { medicine: true }
        }
      },
      orderBy: [{ rackCode: 'asc' }, { shelfCode: 'asc' }, { boxCode: 'asc' }]
    });

    const enriched = racks.map((rack) => ({
      id: rack.id,
      rackCode: rack.rackCode,
      shelfCode: rack.shelfCode,
      boxCode: rack.boxCode,
      label: rack.label,
      potencyColor: rack.potencyColor,
      locationString: `${rack.rackCode}-${rack.shelfCode}-${rack.boxCode}`,
      medicineCount: rack.stocks.length,
      medicines: rack.stocks.map((s) => ({
        id: s.medicine.id,
        name: s.medicine.name,
        potency: s.medicine.potency,
        currentQty: s.currentQty,
        status: s.status
      }))
    }));

    res.json({ racks: enriched });
  })
);

storeRouter.post(
  '/racks',
  storeAuthMiddleware,
  requireManager,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);
    const body = z
      .object({
        rackCode: z.string().min(1).toUpperCase(),
        shelfCode: z.string().min(1),
        boxCode: z.string().min(1).toUpperCase(),
        label: z.string().optional(),
        potencyColor: z.string().optional()
      })
      .parse(req.body);

    const rack = await prisma.storeRack.create({
      data: { storeId, ...body }
    });

    res.status(201).json({
      rack: { ...rack, locationString: `${rack.rackCode}-${rack.shelfCode}-${rack.boxCode}` }
    });
  })
);

// ─── Stock Operations ─────────────────────────────────────────────────────────

storeRouter.post(
  '/stock/add',
  storeAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeId, staffId } = getStoreStaff(req);
    const body = z
      .object({
        medicineId: z.string().min(1),
        qty: z.number().int().min(1),
        batchNumber: z.string().min(1),
        expiryDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
        purchasePricePerUnit: z.number().int().min(0),
        sellingPricePerUnit: z.number().int().min(0),
        manufacturer: z.string().optional(),
        rackId: z.string().optional(),
        note: z.string().optional()
      })
      .parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      let stock = await tx.medicineStock.findUnique({
        where: { medicineId_storeId: { medicineId: body.medicineId, storeId } }
      });

      if (!stock) {
        const medicine = await tx.storeMedicine.findUniqueOrThrow({ where: { id: body.medicineId } });
        stock = await tx.medicineStock.create({
          data: {
            medicineId: body.medicineId,
            storeId,
            currentQty: 0,
            rackId: body.rackId || null,
            status: StockStatus.OUT_OF_STOCK
          }
        });
      } else if (body.rackId && stock.rackId !== body.rackId) {
        stock = await tx.medicineStock.update({
          where: { id: stock.id },
          data: { rackId: body.rackId }
        });
      }

      const batch = await tx.stockBatch.create({
        data: {
          stockId: stock.id,
          batchNumber: body.batchNumber,
          manufacturer: body.manufacturer,
          expiryDate: new Date(body.expiryDate),
          purchasePricePerUnit: body.purchasePricePerUnit,
          sellingPricePerUnit: body.sellingPricePerUnit,
          qty: body.qty
        }
      });

      const newQty = stock.currentQty + body.qty;
      const medicine = await tx.storeMedicine.findUnique({ where: { id: body.medicineId } });
      const newStatus = computeStockStatus(newQty, medicine?.minStockLevel ?? 10);

      const updatedStock = await tx.medicineStock.update({
        where: { id: stock.id },
        data: { currentQty: newQty, status: newStatus }
      });

      const movement = await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          storeId,
          batchId: batch.id,
          staffId,
          type: StockMovementType.PURCHASE_IN,
          qty: body.qty,
          note: body.note
        }
      });

      return { stock: updatedStock, batch, movement };
    });

    res.status(201).json(result);
  })
);

storeRouter.post(
  '/stock/remove',
  storeAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeId, staffId } = getStoreStaff(req);
    const body = z
      .object({
        stockId: z.string().min(1),
        qty: z.number().int().min(1),
        type: z.enum(['SALE_OUT', 'ADJUSTMENT_OUT', 'EXPIRED_REMOVAL']).default('SALE_OUT'),
        batchId: z.string().optional(),
        note: z.string().optional()
      })
      .parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const stock = await tx.medicineStock.findUniqueOrThrow({
        where: { id: body.stockId },
        include: { medicine: true }
      });

      if (stock.currentQty < body.qty) {
        throw new Error(`Insufficient stock. Available: ${stock.currentQty}`);
      }

      const newQty = stock.currentQty - body.qty;
      const newStatus = computeStockStatus(newQty, stock.medicine.minStockLevel);

      const updatedStock = await tx.medicineStock.update({
        where: { id: stock.id },
        data: { currentQty: newQty, status: newStatus }
      });

      if (body.batchId) {
        const batch = await tx.stockBatch.findUnique({ where: { id: body.batchId } });
        if (batch && batch.qty >= body.qty) {
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: { qty: batch.qty - body.qty }
          });
        }
      }

      const movement = await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          storeId,
          batchId: body.batchId || null,
          staffId,
          type: body.type as StockMovementType,
          qty: body.qty,
          note: body.note
        }
      });

      return { stock: updatedStock, movement };
    });

    res.status(201).json(result);
  })
);

storeRouter.post(
  '/stock/adjust',
  storeAuthMiddleware,
  requireManager,
  asyncRoute(async (req, res) => {
    const { storeId, staffId } = getStoreStaff(req);
    const body = z
      .object({
        stockId: z.string().min(1),
        newQty: z.number().int().min(0),
        note: z.string().min(1)
      })
      .parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const stock = await tx.medicineStock.findUniqueOrThrow({
        where: { id: body.stockId },
        include: { medicine: true }
      });

      const diff = body.newQty - stock.currentQty;
      const movementType =
        diff > 0 ? StockMovementType.ADJUSTMENT_IN : StockMovementType.ADJUSTMENT_OUT;

      const newStatus = computeStockStatus(body.newQty, stock.medicine.minStockLevel);
      const updatedStock = await tx.medicineStock.update({
        where: { id: stock.id },
        data: { currentQty: body.newQty, status: newStatus }
      });

      if (diff !== 0) {
        await tx.stockMovement.create({
          data: {
            stockId: stock.id,
            storeId,
            staffId,
            type: movementType,
            qty: Math.abs(diff),
            note: body.note
          }
        });
      }

      return { stock: updatedStock };
    });

    res.json(result);
  })
);

// ─── Alerts ───────────────────────────────────────────────────────────────────

storeRouter.get(
  '/alerts/low-stock',
  storeAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);
    const stocks = await prisma.medicineStock.findMany({
      where: {
        storeId,
        status: { in: [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK] }
      },
      include: {
        medicine: true,
        rack: true
      },
      orderBy: { currentQty: 'asc' }
    });

    const result = stocks.map((s) => ({
      stockId: s.id,
      medicineId: s.medicine.id,
      name: s.medicine.name,
      potency: s.medicine.potency,
      manufacturer: s.medicine.manufacturer,
      currentQty: s.currentQty,
      minStockLevel: s.medicine.minStockLevel,
      status: s.status,
      shortfall: Math.max(0, s.medicine.minStockLevel - s.currentQty),
      rack: s.rack
        ? { locationString: `${s.rack.rackCode}-${s.rack.shelfCode}-${s.rack.boxCode}` }
        : null
    }));

    res.json({ medicines: result, total: result.length });
  })
);

storeRouter.get(
  '/alerts/expiring',
  storeAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);
    const days = Math.min(365, Math.max(1, Number(req.query['days']) || 60));
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const batches = await prisma.stockBatch.findMany({
      where: {
        expiryDate: { lte: cutoff },
        qty: { gt: 0 },
        stock: { storeId }
      },
      include: {
        stock: {
          include: {
            medicine: true,
            rack: true
          }
        }
      },
      orderBy: { expiryDate: 'asc' }
    });

    const result = batches.map((b) => {
      const enriched = enrichBatch(b as { expiryDate: Date; [key: string]: unknown });
      return {
      batchId: b.id,
      batchNumber: b.batchNumber,
      qty: b.qty,
      ...enriched,
      medicine: {
        id: b.stock.medicine.id,
        name: b.stock.medicine.name,
        potency: b.stock.medicine.potency,
        manufacturer: b.stock.medicine.manufacturer
      },
      rack: b.stock.rack
        ? { locationString: `${b.stock.rack.rackCode}-${b.stock.rack.shelfCode}-${b.stock.rack.boxCode}` }
        : null
      };
    });

    res.json({ batches: result, total: result.length });
  })
);

// ─── Dashboard & Reports ──────────────────────────────────────────────────────

storeRouter.get(
  '/dashboard',
  storeAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);

    const [
      totalMedicines,
      lowStockCount,
      outOfStockCount,
      expiringIn30,
      expiringIn60,
      recentMovements,
      stockValues,
      topLowStock
    ] = await Promise.all([
      prisma.medicineStock.count({ where: { storeId } }),
      prisma.medicineStock.count({ where: { storeId, status: 'LOW_STOCK' } }),
      prisma.medicineStock.count({ where: { storeId, status: 'OUT_OF_STOCK' } }),
      prisma.stockBatch.count({
        where: {
          qty: { gt: 0 },
          stock: { storeId },
          expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.stockBatch.count({
        where: {
          qty: { gt: 0 },
          stock: { storeId },
          expiryDate: {
            gt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.stockMovement.findMany({
        where: { storeId },
        include: {
          stock: { include: { medicine: true } },
          staff: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.stockBatch.findMany({
        where: { stock: { storeId }, qty: { gt: 0 } },
        select: { qty: true, sellingPricePerUnit: true }
      }),
      prisma.medicineStock.findMany({
        where: { storeId, status: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] } },
        include: { medicine: true },
        orderBy: { currentQty: 'asc' },
        take: 5
      })
    ]);

    const totalStockValue = stockValues.reduce(
      (sum, b) => sum + b.qty * b.sellingPricePerUnit,
      0
    );

    res.json({
      totalMedicines,
      lowStockCount: lowStockCount + outOfStockCount,
      outOfStockCount,
      expiringIn30,
      expiringIn60,
      totalStockValue,
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        medicineName: m.stock.medicine.name,
        potency: m.stock.medicine.potency,
        type: m.type,
        qty: m.qty,
        note: m.note,
        staffName: m.staff?.name,
        createdAt: m.createdAt
      })),
      topLowStock: topLowStock.map((s) => ({
        stockId: s.id,
        name: s.medicine.name,
        potency: s.medicine.potency,
        currentQty: s.currentQty,
        minStockLevel: s.medicine.minStockLevel,
        status: s.status
      }))
    });
  })
);

storeRouter.get(
  '/movements',
  storeAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);
    const page = Math.max(1, Number(req.query['page']) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(req.query['pageSize']) || 20));

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where: { storeId } }),
      prisma.stockMovement.findMany({
        where: { storeId },
        include: {
          stock: { include: { medicine: true } },
          staff: { select: { name: true } },
          batch: { select: { batchNumber: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    res.json({
      movements: movements.map((m) => ({
        id: m.id,
        medicineName: m.stock.medicine.name,
        potency: m.stock.medicine.potency,
        type: m.type,
        qty: m.qty,
        note: m.note,
        batchNumber: m.batch?.batchNumber,
        staffName: m.staff?.name,
        createdAt: m.createdAt
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  })
);

// ─── Store Setup (Manager only) ───────────────────────────────────────────────

storeRouter.get(
  '/info',
  storeAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);
    const store = await prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      include: {
        staff: { select: { id: true, name: true, staffCode: true, role: true, isActive: true } },
        _count: { select: { racks: true, stocks: true } }
      }
    });

    res.json({ store });
  })
);

storeRouter.post(
  '/staff',
  storeAuthMiddleware,
  requireManager,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);
    const body = z
      .object({
        name: z.string().min(2),
        staffCode: z.string().min(2).toUpperCase(),
        pin: z.string().min(4).max(8),
        role: z.enum(['MANAGER', 'STAFF']).default('STAFF')
      })
      .parse(req.body);

    const pinHash = await bcrypt.hash(body.pin, 10);
    const staff = await prisma.storeStaff.create({
      data: {
        name: body.name,
        staffCode: body.staffCode,
        pinHash,
        role: body.role,
        storeId
      }
    });

    res.status(201).json({
      staff: { id: staff.id, name: staff.name, staffCode: staff.staffCode, role: staff.role }
    });
  })
);

// ─── First-Run Setup (no auth required) ──────────────────────────────────────

storeRouter.post(
  '/setup',
  asyncRoute(async (req, res) => {
    const existingStore = await prisma.store.findFirst();
    if (existingStore) {
      return res.status(409).json({ message: 'Store already set up.' });
    }

    const body = z
      .object({
        storeName: z.string().min(2),
        storeCode: z.string().min(2).toUpperCase(),
        storeAddress: z.string().optional(),
        managerName: z.string().min(2),
        managerPin: z.string().min(4).max(8)
      })
      .parse(req.body);

    const pinHash = await bcrypt.hash(body.managerPin, 10);

    const store = await prisma.store.create({
      data: {
        name: body.storeName,
        code: body.storeCode,
        address: body.storeAddress,
        staff: {
          create: {
            name: body.managerName,
            staffCode: `${body.storeCode}-MGR`,
            pinHash,
            role: 'MANAGER'
          }
        }
      },
      include: { staff: true }
    });

    const manager = store.staff[0];
    const token = signStoreToken({
      staffId: manager.id,
      storeId: store.id,
      role: 'MANAGER',
      name: manager.name
    });

    res.status(201).json({
      token,
      store: { id: store.id, name: store.name, code: store.code },
      staff: { id: manager.id, name: manager.name, staffCode: manager.staffCode, role: manager.role }
    });
  })
);

// ─── Staff Activity Tracking ──────────────────────────────────────────────────

storeRouter.get(
  '/staff/activity',
  storeAuthMiddleware,
  requireManager,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);

    const period = (req.query['period'] as string) || 'today';
    const since = periodToDate(period);

    const [allStaff, movements] = await Promise.all([
      prisma.storeStaff.findMany({
        where: { storeId, isActive: true },
        select: { id: true, name: true, staffCode: true, role: true }
      }),
      prisma.stockMovement.groupBy({
        by: ['staffId', 'type'],
        where: { storeId, staffId: { not: null }, createdAt: { gte: since } },
        _count: { id: true },
        _sum: { qty: true }
      })
    ]);

    const staffMap = new Map(allStaff.map((s) => [s.id, s]));

    const activityByStaff = new Map<
      string,
      {
        staffId: string;
        name: string;
        staffCode: string;
        role: string;
        totalActions: number;
        totalQtyIn: number;
        totalQtyOut: number;
        breakdown: { type: string; count: number; qty: number }[];
      }
    >();

    for (const row of movements) {
      if (!row.staffId) continue;
      const staff = staffMap.get(row.staffId);
      if (!staff) continue;

      if (!activityByStaff.has(row.staffId)) {
        activityByStaff.set(row.staffId, {
          staffId: row.staffId,
          name: staff.name,
          staffCode: staff.staffCode,
          role: staff.role,
          totalActions: 0,
          totalQtyIn: 0,
          totalQtyOut: 0,
          breakdown: []
        });
      }

      const entry = activityByStaff.get(row.staffId)!;
      const count = row._count.id;
      const qty = row._sum.qty ?? 0;
      const isInbound = ['PURCHASE_IN', 'ADJUSTMENT_IN', 'TRANSFER_IN'].includes(row.type);

      entry.totalActions += count;
      if (isInbound) entry.totalQtyIn += qty;
      else entry.totalQtyOut += qty;
      entry.breakdown.push({ type: row.type, count, qty });
    }

    // Include staff with zero activity too
    for (const s of allStaff) {
      if (!activityByStaff.has(s.id)) {
        activityByStaff.set(s.id, {
          staffId: s.id,
          name: s.name,
          staffCode: s.staffCode,
          role: s.role,
          totalActions: 0,
          totalQtyIn: 0,
          totalQtyOut: 0,
          breakdown: []
        });
      }
    }

    const result = Array.from(activityByStaff.values()).sort(
      (a, b) => b.totalActions - a.totalActions
    );

    res.json({ period, since, staff: result });
  })
);

storeRouter.get(
  '/staff/:staffId/activity',
  storeAuthMiddleware,
  requireManager,
  asyncRoute(async (req, res) => {
    const { storeId } = getStoreStaff(req);
    const staffId = req.params['staffId'] as string;
    const period = (req.query['period'] as string) || 'week';
    const since = periodToDate(period);

    const [staff, movements, recentMovements] = await Promise.all([
      prisma.storeStaff.findUniqueOrThrow({ where: { id: staffId } }),
      prisma.stockMovement.groupBy({
        by: ['type'],
        where: { storeId, staffId, createdAt: { gte: since } },
        _count: { id: true },
        _sum: { qty: true }
      }),
      prisma.stockMovement.findMany({
        where: { storeId, staffId },
        include: { stock: { include: { medicine: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30
      })
    ]);

    res.json({
      staff: {
        id: staff.id,
        name: staff.name,
        staffCode: staff.staffCode,
        role: staff.role,
        createdAt: staff.createdAt
      },
      period,
      breakdown: movements.map((m) => ({
        type: m.type,
        count: m._count.id,
        qty: m._sum.qty ?? 0
      })),
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        type: m.type,
        qty: m.qty,
        note: m.note,
        medicineName: m.stock.medicine.name,
        potency: m.stock.medicine.potency,
        createdAt: m.createdAt
      }))
    });
  })
);

function periodToDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'all':
      return new Date(0);
    default:
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}
