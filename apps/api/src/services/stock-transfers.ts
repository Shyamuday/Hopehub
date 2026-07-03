import {
  StockMovementType,
  StockStatus,
  StockTransferStatus,
  StoreKind,
  type Prisma
} from '@prisma/client';
import { prisma } from '../db.js';
import { computeStockStatus } from '../routes/store/shared.js';

export class StockTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockTransferError';
  }
}

const transferInclude = {
  fromStore: { select: { id: true, name: true, code: true, kind: true } },
  toStore: { select: { id: true, name: true, code: true, kind: true } },
  lines: {
    include: {
      medicine: { select: { id: true, name: true, potency: true, manufacturer: true } }
    }
  }
} satisfies Prisma.StockTransferInclude;

function nextTransferNumber(fromCode: string, toCode: string) {
  return `TRF-${fromCode}-${toCode}-${Date.now().toString(36).toUpperCase()}`;
}

export async function resolveWarehouseStoreId(userId: string, role: string): Promise<string | null> {
  if (role === 'ADMIN') return null;
  const profile = await prisma.warehouseManagerProfile.findUnique({
    where: { userId },
    select: { warehouseId: true }
  });
  return profile?.warehouseId ?? null;
}

export async function getWarehouseDashboard(warehouseId: string) {
  const [warehouse, stockRows, pendingDispatch, inTransit] = await Promise.all([
    prisma.store.findUniqueOrThrow({
      where: { id: warehouseId },
      select: { id: true, name: true, code: true, address: true, kind: true }
    }),
    prisma.medicineStock.findMany({
      where: { storeId: warehouseId, currentQty: { gt: 0 } },
      include: {
        medicine: { select: { id: true, name: true, potency: true } },
        batches: { where: { qty: { gt: 0 } }, orderBy: { expiryDate: 'asc' } }
      },
      orderBy: { medicine: { name: 'asc' } }
    }),
    prisma.stockTransfer.count({
      where: { fromStoreId: warehouseId, status: StockTransferStatus.PENDING_DISPATCH }
    }),
    prisma.stockTransfer.count({
      where: { fromStoreId: warehouseId, status: StockTransferStatus.IN_TRANSIT }
    })
  ]);

  const totalUnits = stockRows.reduce((sum, row) => sum + row.currentQty, 0);
  const skuCount = stockRows.length;

  return {
    warehouse,
    kpis: {
      skuCount,
      totalUnits,
      pendingDispatch,
      inTransit
    },
    stock: stockRows.map((row) => ({
      stockId: row.id,
      medicineId: row.medicineId,
      name: row.medicine.name,
      potency: row.medicine.potency,
      currentQty: row.currentQty,
      status: row.status,
      batches: row.batches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        qty: batch.qty,
        expiryDate: batch.expiryDate
      }))
    }))
  };
}

export async function createStockTransfer(input: {
  fromStoreId: string;
  toStoreId: string;
  notes?: string;
  createdById?: string;
  lines: Array<{ medicineId: string; qtyRequested: number }>;
}) {
  if (!input.lines.length) {
    throw new StockTransferError('At least one line item is required.');
  }
  if (input.fromStoreId === input.toStoreId) {
    throw new StockTransferError('Source and destination must differ.');
  }

  const [fromStore, toStore] = await Promise.all([
    prisma.store.findUniqueOrThrow({ where: { id: input.fromStoreId } }),
    prisma.store.findUniqueOrThrow({ where: { id: input.toStoreId } })
  ]);

  if (fromStore.kind !== StoreKind.WAREHOUSE) {
    throw new StockTransferError('Transfers must originate from a warehouse store.');
  }
  if (toStore.kind !== StoreKind.BRANCH) {
    throw new StockTransferError('Transfers must target a branch store.');
  }

  const transfer = await prisma.stockTransfer.create({
    data: {
      transferNumber: nextTransferNumber(fromStore.code, toStore.code),
      fromStoreId: input.fromStoreId,
      toStoreId: input.toStoreId,
      notes: input.notes,
      createdById: input.createdById,
      lines: {
        create: input.lines.map((line) => ({
          medicineId: line.medicineId,
          qtyRequested: line.qtyRequested
        }))
      }
    },
    include: transferInclude
  });

  return formatTransfer(transfer);
}

export async function listStockTransfers(filters: {
  fromStoreId?: string;
  toStoreId?: string;
  status?: StockTransferStatus;
}) {
  const transfers = await prisma.stockTransfer.findMany({
    where: {
      ...(filters.fromStoreId ? { fromStoreId: filters.fromStoreId } : {}),
      ...(filters.toStoreId ? { toStoreId: filters.toStoreId } : {}),
      ...(filters.status ? { status: filters.status } : {})
    },
    include: transferInclude,
    orderBy: { createdAt: 'desc' }
  });

  return transfers.map(formatTransfer);
}

export async function getStockTransfer(id: string) {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: transferInclude
  });
  return transfer ? formatTransfer(transfer) : null;
}

export type DispatchLineInput = {
  transferLineId: string;
  qtyDispatched: number;
  sourceBatchId: string;
};

export async function dispatchStockTransfer(
  transferId: string,
  warehouseId: string,
  lines: DispatchLineInput[]
) {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: transferId },
    include: { lines: true, fromStore: { select: { code: true } }, toStore: { select: { code: true } } }
  });

  if (!transfer || transfer.fromStoreId !== warehouseId) {
    throw new StockTransferError('Transfer not found for this warehouse.');
  }
  if (transfer.status !== StockTransferStatus.PENDING_DISPATCH) {
    throw new StockTransferError('Only pending transfers can be dispatched.');
  }

  const lineMap = new Map(transfer.lines.map((line) => [line.id, line]));

  for (const input of lines) {
    const line = lineMap.get(input.transferLineId);
    if (!line) throw new StockTransferError('Invalid transfer line.');
    if (input.qtyDispatched < 1 || input.qtyDispatched > line.qtyRequested) {
      throw new StockTransferError('Invalid dispatch quantity.');
    }
  }

  return prisma.$transaction(async (tx) => {
    for (const input of lines) {
      const line = lineMap.get(input.transferLineId)!;
      const batch = await tx.stockBatch.findUnique({
        where: { id: input.sourceBatchId },
        include: { stock: { include: { medicine: true } } }
      });

      if (!batch || batch.stock.storeId !== warehouseId || batch.stock.medicineId !== line.medicineId) {
        throw new StockTransferError('Invalid source batch for dispatch.');
      }
      if (batch.qty < input.qtyDispatched) {
        throw new StockTransferError(`Insufficient batch qty for ${batch.batchNumber}.`);
      }

      await tx.stockBatch.update({
        where: { id: batch.id },
        data: { qty: batch.qty - input.qtyDispatched }
      });

      const stock = batch.stock;
      const newQty = stock.currentQty - input.qtyDispatched;
      const newStatus = computeStockStatus(newQty, stock.medicine.minStockLevel);

      await tx.medicineStock.update({
        where: { id: stock.id },
        data: { currentQty: newQty, status: newStatus }
      });

      await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          storeId: warehouseId,
          batchId: batch.id,
          type: StockMovementType.TRANSFER_OUT,
          qty: input.qtyDispatched,
          note: `Transfer ${transfer.transferNumber} → ${transfer.toStore.code}`
        }
      });

      await tx.stockTransferLine.update({
        where: { id: line.id },
        data: {
          qtyDispatched: input.qtyDispatched,
          sourceBatchId: batch.id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          purchasePricePerUnit: batch.purchasePricePerUnit,
          sellingPricePerUnit: batch.sellingPricePerUnit
        }
      });
    }

    await tx.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: StockTransferStatus.IN_TRANSIT,
        dispatchedAt: new Date()
      }
    });

    const updated = await tx.stockTransfer.findUniqueOrThrow({
      where: { id: transferId },
      include: transferInclude
    });
    return formatTransfer(updated);
  });
}

export async function receiveStockTransfer(transferId: string, storeId: string, staffId?: string) {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: transferId },
    include: { lines: true, fromStore: { select: { code: true } } }
  });

  if (!transfer || transfer.toStoreId !== storeId) {
    throw new StockTransferError('Transfer not found for this store.');
  }
  if (transfer.status !== StockTransferStatus.IN_TRANSIT) {
    throw new StockTransferError('Transfer is not in transit.');
  }

  const dispatchableLines = transfer.lines.filter((line) => line.qtyDispatched > 0);
  if (!dispatchableLines.length) {
    throw new StockTransferError('No dispatched lines to receive.');
  }

  return prisma.$transaction(async (tx) => {
    for (const line of dispatchableLines) {
      let stock = await tx.medicineStock.findUnique({
        where: { medicineId_storeId: { medicineId: line.medicineId, storeId } }
      });

      if (!stock) {
        stock = await tx.medicineStock.create({
          data: {
            medicineId: line.medicineId,
            storeId,
            currentQty: 0,
            status: StockStatus.OUT_OF_STOCK
          }
        });
      }

      const batch = await tx.stockBatch.create({
        data: {
          stockId: stock.id,
          batchNumber: line.batchNumber!,
          expiryDate: line.expiryDate!,
          purchasePricePerUnit: line.purchasePricePerUnit!,
          sellingPricePerUnit: line.sellingPricePerUnit!,
          qty: line.qtyDispatched
        }
      });

      const medicine = await tx.storeMedicine.findUnique({ where: { id: line.medicineId } });
      const newQty = stock.currentQty + line.qtyDispatched;
      const newStatus = computeStockStatus(newQty, medicine?.minStockLevel ?? 10);

      await tx.medicineStock.update({
        where: { id: stock.id },
        data: { currentQty: newQty, status: newStatus }
      });

      await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          storeId,
          batchId: batch.id,
          staffId,
          type: StockMovementType.TRANSFER_IN,
          qty: line.qtyDispatched,
          note: `Transfer ${transfer.transferNumber} ← ${transfer.fromStore.code}`
        }
      });

      await tx.stockTransferLine.update({
        where: { id: line.id },
        data: { qtyReceived: line.qtyDispatched }
      });
    }

    await tx.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: StockTransferStatus.RECEIVED,
        receivedAt: new Date()
      }
    });

    const updated = await tx.stockTransfer.findUniqueOrThrow({
      where: { id: transferId },
      include: transferInclude
    });
    return formatTransfer(updated);
  });
}

function formatTransfer(transfer: Prisma.StockTransferGetPayload<{ include: typeof transferInclude }>) {
  const requestedQty = transfer.lines.reduce((sum, line) => sum + line.qtyRequested, 0);
  const dispatchedQty = transfer.lines.reduce((sum, line) => sum + line.qtyDispatched, 0);
  return {
    ...transfer,
    totals: { lineCount: transfer.lines.length, requestedQty, dispatchedQty }
  };
}
