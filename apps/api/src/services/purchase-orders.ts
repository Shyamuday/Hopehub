import {
  PurchaseOrderStatus,
  StockMovementType,
  StockStatus,
  type Prisma
} from '@prisma/client';
import { prisma } from '../db.js';
import { computeStockStatus } from '../routes/store/shared.js';

export class PurchaseOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurchaseOrderError';
  }
}

const poInclude = {
  supplier: { select: { id: true, code: true, name: true, email: true } },
  store: { select: { id: true, name: true, code: true, address: true } },
  lines: {
    include: {
      medicine: { select: { id: true, name: true, potency: true, manufacturer: true } }
    }
  },
  grns: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    select: { id: true, grnNumber: true, createdAt: true }
  }
} satisfies Prisma.PurchaseOrderInclude;

export async function resolveSupplierId(userId: string, role: string): Promise<string | null> {
  if (role === 'ADMIN') return null;
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId },
    select: { supplierId: true }
  });
  return profile?.supplierId ?? null;
}

function nextDocNumber(prefix: string, storeCode: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${storeCode}-${stamp}`;
}

export async function createPurchaseOrder(input: {
  supplierId: string;
  storeId: string;
  notes?: string;
  createdById?: string;
  lines: Array<{ medicineId: string; qtyOrdered: number; unitPriceInPaise: number }>;
  send?: boolean;
}) {
  if (!input.lines.length) {
    throw new PurchaseOrderError('At least one line item is required.');
  }

  const store = await prisma.store.findUniqueOrThrow({
    where: { id: input.storeId },
    select: { code: true }
  });

  return prisma.purchaseOrder.create({
    data: {
      poNumber: nextDocNumber('PO', store.code),
      supplierId: input.supplierId,
      storeId: input.storeId,
      status: input.send ? PurchaseOrderStatus.SENT : PurchaseOrderStatus.DRAFT,
      notes: input.notes,
      createdById: input.createdById,
      lines: {
        create: input.lines.map((line) => ({
          medicineId: line.medicineId,
          qtyOrdered: line.qtyOrdered,
          unitPriceInPaise: line.unitPriceInPaise
        }))
      }
    },
    include: poInclude
  });
}

export async function listPurchaseOrders(filters: {
  supplierId?: string;
  storeId?: string;
  status?: PurchaseOrderStatus;
}) {
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.storeId ? { storeId: filters.storeId } : {}),
      ...(filters.status ? { status: filters.status } : {})
    },
    include: poInclude,
    orderBy: { createdAt: 'desc' }
  });

  return orders.map(formatPurchaseOrder);
}

export async function getPurchaseOrder(id: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: poInclude
  });
  if (!order) return null;
  return formatPurchaseOrder(order);
}

export async function supplierConfirmPurchaseOrder(
  purchaseOrderId: string,
  supplierId: string,
  input: { supplierNotes?: string; expectedDeliveryDate?: string }
) {
  const order = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
  if (!order || order.supplierId !== supplierId) {
    throw new PurchaseOrderError('Purchase order not found for this supplier.');
  }
  if (order.status !== PurchaseOrderStatus.SENT) {
    throw new PurchaseOrderError('Only sent purchase orders can be confirmed.');
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      status: PurchaseOrderStatus.CONFIRMED,
      confirmedAt: new Date(),
      supplierNotes: input.supplierNotes,
      expectedDeliveryDate: input.expectedDeliveryDate
        ? new Date(input.expectedDeliveryDate)
        : undefined
    },
    include: poInclude
  });

  return formatPurchaseOrder(updated);
}

export type GrnLineInput = {
  purchaseOrderLineId: string;
  qtyReceived: number;
  batchNumber: string;
  expiryDate: string;
  purchasePricePerUnit: number;
  sellingPricePerUnit: number;
  manufacturer?: string;
};

export async function postGoodsReceipt(input: {
  purchaseOrderId: string;
  storeId: string;
  staffId?: string;
  note?: string;
  lines: GrnLineInput[];
}) {
  if (!input.lines.length) {
    throw new PurchaseOrderError('At least one receipt line is required.');
  }

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: input.purchaseOrderId },
    include: { lines: true, store: { select: { code: true } } }
  });

  if (!order || order.storeId !== input.storeId) {
    throw new PurchaseOrderError('Purchase order not found for this store.');
  }
  if (
    order.status !== PurchaseOrderStatus.CONFIRMED &&
    order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
  ) {
    throw new PurchaseOrderError('Purchase order must be confirmed before goods receipt.');
  }

  const lineMap = new Map(order.lines.map((line) => [line.id, line]));

  for (const line of input.lines) {
    const poLine = lineMap.get(line.purchaseOrderLineId);
    if (!poLine) {
      throw new PurchaseOrderError('Invalid purchase order line.');
    }
    const remaining = poLine.qtyOrdered - poLine.qtyReceived;
    if (line.qtyReceived < 1 || line.qtyReceived > remaining) {
      throw new PurchaseOrderError(
        `Invalid quantity for ${poLine.id}. Remaining: ${remaining}.`
      );
    }
  }

  const grnNumber = nextDocNumber('GRN', order.store.code);

  return prisma.$transaction(async (tx) => {
    const grn = await tx.goodsReceiptNote.create({
      data: {
        grnNumber,
        purchaseOrderId: order.id,
        storeId: input.storeId,
        receivedByStaffId: input.staffId,
        note: input.note
      }
    });

    for (const line of input.lines) {
      const poLine = lineMap.get(line.purchaseOrderLineId)!;

      await tx.goodsReceiptLine.create({
        data: {
          grnId: grn.id,
          purchaseOrderLineId: line.purchaseOrderLineId,
          qtyReceived: line.qtyReceived,
          batchNumber: line.batchNumber,
          expiryDate: new Date(line.expiryDate),
          purchasePricePerUnit: line.purchasePricePerUnit,
          sellingPricePerUnit: line.sellingPricePerUnit
        }
      });

      let stock = await tx.medicineStock.findUnique({
        where: {
          medicineId_storeId: { medicineId: poLine.medicineId, storeId: input.storeId }
        }
      });

      if (!stock) {
        stock = await tx.medicineStock.create({
          data: {
            medicineId: poLine.medicineId,
            storeId: input.storeId,
            currentQty: 0,
            status: StockStatus.OUT_OF_STOCK
          }
        });
      }

      const batch = await tx.stockBatch.create({
        data: {
          stockId: stock.id,
          batchNumber: line.batchNumber,
          manufacturer: line.manufacturer,
          expiryDate: new Date(line.expiryDate),
          purchasePricePerUnit: line.purchasePricePerUnit,
          sellingPricePerUnit: line.sellingPricePerUnit,
          qty: line.qtyReceived
        }
      });

      const newQty = stock.currentQty + line.qtyReceived;
      const medicine = await tx.storeMedicine.findUnique({ where: { id: poLine.medicineId } });
      const newStatus = computeStockStatus(newQty, medicine?.minStockLevel ?? 10);

      await tx.medicineStock.update({
        where: { id: stock.id },
        data: { currentQty: newQty, status: newStatus }
      });

      await tx.stockMovement.create({
        data: {
          stockId: stock.id,
          storeId: input.storeId,
          batchId: batch.id,
          staffId: input.staffId,
          type: StockMovementType.PURCHASE_IN,
          qty: line.qtyReceived,
          note: `GRN ${grnNumber} / PO ${order.poNumber}`
        }
      });

      const newReceived = poLine.qtyReceived + line.qtyReceived;
      await tx.purchaseOrderLine.update({
        where: { id: poLine.id },
        data: { qtyReceived: newReceived }
      });
      poLine.qtyReceived = newReceived;
    }

    const refreshedLines = await tx.purchaseOrderLine.findMany({
      where: { purchaseOrderId: order.id }
    });
    const allReceived = refreshedLines.every((line) => line.qtyReceived >= line.qtyOrdered);
    const newStatus = allReceived
      ? PurchaseOrderStatus.RECEIVED
      : PurchaseOrderStatus.PARTIALLY_RECEIVED;

    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { status: newStatus }
    });

    return tx.goodsReceiptNote.findUniqueOrThrow({
      where: { id: grn.id },
      include: {
        lines: {
          include: {
            purchaseOrderLine: {
              include: { medicine: { select: { id: true, name: true, potency: true } } }
            }
          }
        },
        purchaseOrder: { select: { poNumber: true, status: true } }
      }
    });
  });
}

function formatPurchaseOrder(order: Prisma.PurchaseOrderGetPayload<{ include: typeof poInclude }>) {
  const totalInPaise = order.lines.reduce(
    (sum, line) => sum + line.qtyOrdered * line.unitPriceInPaise,
    0
  );
  const receivedQty = order.lines.reduce((sum, line) => sum + line.qtyReceived, 0);
  const orderedQty = order.lines.reduce((sum, line) => sum + line.qtyOrdered, 0);

  return {
    ...order,
    totals: {
      lineCount: order.lines.length,
      orderedQty,
      receivedQty,
      totalInPaise
    }
  };
}
