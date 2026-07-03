import { MedicineDeliveryStatus, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';

export class MedicineDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MedicineDeliveryError';
  }
}

const deliveryInclude = {
  store: { select: { id: true, name: true, code: true, address: true, phone: true } },
  patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
  assignedExecutive: { select: { id: true, name: true, mobile: true } },
  prescription: { select: { id: true, version: true, diagnosis: true } },
  lines: {
    include: {
      medicine: { select: { id: true, name: true, potency: true } }
    }
  }
} satisfies Prisma.MedicineDeliveryInclude;

function nextDeliveryNumber(storeCode: string) {
  return `DEL-${storeCode}-${Date.now().toString(36).toUpperCase()}`;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function resolveDeliveryExecutiveStoreId(userId: string, role: string): Promise<string | null> {
  if (role === 'ADMIN') return null;
  const profile = await prisma.deliveryExecutiveProfile.findUnique({
    where: { userId },
    select: { storeId: true }
  });
  return profile?.storeId ?? null;
}

export async function getDeliveryDashboard(executiveUserId: string, storeId: string) {
  const [pending, assigned, outForDelivery, deliveredToday] = await Promise.all([
    prisma.medicineDelivery.count({
      where: { storeId, status: MedicineDeliveryStatus.PENDING }
    }),
    prisma.medicineDelivery.count({
      where: { assignedExecutiveId: executiveUserId, status: MedicineDeliveryStatus.ASSIGNED }
    }),
    prisma.medicineDelivery.count({
      where: { assignedExecutiveId: executiveUserId, status: MedicineDeliveryStatus.OUT_FOR_DELIVERY }
    }),
    prisma.medicineDelivery.count({
      where: {
        assignedExecutiveId: executiveUserId,
        status: MedicineDeliveryStatus.DELIVERED,
        deliveredAt: { gte: startOfToday() }
      }
    })
  ]);

  return {
    kpis: { pending, assigned, outForDelivery, deliveredToday }
  };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function createMedicineDelivery(input: {
  storeId: string;
  patientId: string;
  prescriptionId?: string;
  deliveryAddress: string;
  deliveryPhone: string;
  notes?: string;
  lines: Array<{ medicineId?: string; label: string; qty: number }>;
  otp?: string;
}) {
  if (!input.lines.length) {
    throw new MedicineDeliveryError('At least one line item is required.');
  }

  const store = await prisma.store.findUniqueOrThrow({ where: { id: input.storeId } });
  await prisma.user.findFirstOrThrow({
    where: { id: input.patientId, role: 'PATIENT' }
  });

  const otp = input.otp ?? generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  const delivery = await prisma.medicineDelivery.create({
    data: {
      deliveryNumber: nextDeliveryNumber(store.code),
      storeId: input.storeId,
      patientId: input.patientId,
      prescriptionId: input.prescriptionId,
      deliveryAddress: input.deliveryAddress,
      deliveryPhone: input.deliveryPhone,
      notes: input.notes,
      otpHash,
      lines: {
        create: input.lines.map((line) => ({
          medicineId: line.medicineId,
          label: line.label,
          qty: line.qty
        }))
      }
    },
    include: deliveryInclude
  });

  return { ...formatDelivery(delivery), deliveryOtp: otp };
}

export async function listMedicineDeliveries(filters: {
  storeId?: string;
  executiveUserId?: string;
  status?: MedicineDeliveryStatus;
  forExecutiveId?: string;
}) {
  const where: Prisma.MedicineDeliveryWhereInput = {
    ...(filters.storeId ? { storeId: filters.storeId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.forExecutiveId
      ? {
          OR: [
            { status: MedicineDeliveryStatus.PENDING, ...(filters.storeId ? { storeId: filters.storeId } : {}) },
            { assignedExecutiveId: filters.forExecutiveId }
          ]
        }
      : filters.executiveUserId
        ? { assignedExecutiveId: filters.executiveUserId }
        : {})
  };

  const deliveries = await prisma.medicineDelivery.findMany({
    where,
    include: deliveryInclude,
    orderBy: { createdAt: 'desc' }
  });

  return deliveries.map(formatDelivery);
}

export async function getMedicineDelivery(id: string) {
  const delivery = await prisma.medicineDelivery.findUnique({
    where: { id },
    include: deliveryInclude
  });
  return delivery ? formatDelivery(delivery) : null;
}

export async function acceptMedicineDelivery(deliveryId: string, executiveUserId: string, storeId: string) {
  const delivery = await prisma.medicineDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.storeId !== storeId) {
    throw new MedicineDeliveryError('Delivery not found for your branch.');
  }
  if (delivery.status !== MedicineDeliveryStatus.PENDING) {
    throw new MedicineDeliveryError('Only pending deliveries can be accepted.');
  }

  const updated = await prisma.medicineDelivery.update({
    where: { id: deliveryId },
    data: {
      status: MedicineDeliveryStatus.ASSIGNED,
      assignedExecutiveId: executiveUserId,
      assignedAt: new Date()
    },
    include: deliveryInclude
  });
  return formatDelivery(updated);
}

export async function pickupMedicineDelivery(deliveryId: string, executiveUserId: string) {
  const delivery = await prisma.medicineDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.assignedExecutiveId !== executiveUserId) {
    throw new MedicineDeliveryError('Delivery not assigned to you.');
  }
  if (delivery.status !== MedicineDeliveryStatus.ASSIGNED) {
    throw new MedicineDeliveryError('Delivery must be assigned before pickup.');
  }

  const updated = await prisma.medicineDelivery.update({
    where: { id: deliveryId },
    data: {
      status: MedicineDeliveryStatus.OUT_FOR_DELIVERY,
      pickedUpAt: new Date()
    },
    include: deliveryInclude
  });
  return formatDelivery(updated);
}

export async function completeMedicineDelivery(
  deliveryId: string,
  executiveUserId: string,
  input: { otp: string; proofNote?: string }
) {
  const delivery = await prisma.medicineDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.assignedExecutiveId !== executiveUserId) {
    throw new MedicineDeliveryError('Delivery not assigned to you.');
  }
  if (delivery.status !== MedicineDeliveryStatus.OUT_FOR_DELIVERY) {
    throw new MedicineDeliveryError('Delivery is not out for delivery.');
  }
  if (!delivery.otpHash || !(await bcrypt.compare(input.otp, delivery.otpHash))) {
    throw new MedicineDeliveryError('Invalid delivery OTP.');
  }

  const updated = await prisma.medicineDelivery.update({
    where: { id: deliveryId },
    data: {
      status: MedicineDeliveryStatus.DELIVERED,
      deliveredAt: new Date(),
      proofNote: input.proofNote,
      otpHash: null
    },
    include: deliveryInclude
  });
  return formatDelivery(updated);
}

export async function failMedicineDelivery(
  deliveryId: string,
  executiveUserId: string,
  reason: string
) {
  const delivery = await prisma.medicineDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.assignedExecutiveId !== executiveUserId) {
    throw new MedicineDeliveryError('Delivery not assigned to you.');
  }
  if (
    delivery.status !== MedicineDeliveryStatus.ASSIGNED &&
    delivery.status !== MedicineDeliveryStatus.OUT_FOR_DELIVERY
  ) {
    throw new MedicineDeliveryError('Delivery cannot be marked failed in its current state.');
  }

  const updated = await prisma.medicineDelivery.update({
    where: { id: deliveryId },
    data: {
      status: MedicineDeliveryStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
      otpHash: null
    },
    include: deliveryInclude
  });
  return formatDelivery(updated);
}

function formatDelivery(delivery: Prisma.MedicineDeliveryGetPayload<{ include: typeof deliveryInclude }>) {
  const itemCount = delivery.lines.reduce((sum, line) => sum + line.qty, 0);
  return {
    ...delivery,
    totals: { lineCount: delivery.lines.length, itemCount }
  };
}
