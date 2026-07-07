import { PatientAddressType, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { normalizeMobile } from './patient-identity.js';

export const MAX_PATIENT_ADDRESSES = 10;

export const patientAddressInputSchema = z.object({
  label: z.string().trim().min(1).max(60),
  addressType: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  recipientName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(8).max(20),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  landmark: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().trim().regex(/^\d{6}$/, 'PIN code must be 6 digits.'),
  country: z.string().trim().min(2).max(80).default('India'),
  deliveryInstructions: z.string().trim().max(500).optional().nullable(),
  isDefault: z.boolean().optional()
});

export type PatientAddressInput = z.infer<typeof patientAddressInputSchema>;

export const patientAddressSelect = {
  id: true,
  label: true,
  addressType: true,
  recipientName: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  landmark: true,
  city: true,
  state: true,
  pincode: true,
  country: true,
  deliveryInstructions: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} as const;

export function formatPatientAddress(addr: {
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string | null;
}) {
  const parts = [
    addr.addressLine1,
    addr.addressLine2,
    addr.landmark,
    addr.city,
    addr.state,
    addr.pincode,
    addr.country || 'India'
  ].filter((p) => p && String(p).trim());
  return parts.join(', ');
}

function normalizePhone(phone: string) {
  const normalized = normalizeMobile(phone);
  return normalized ?? phone.replace(/\s+/g, '');
}

async function ensureLegacyAddressMigrated(patientId: string) {
  const existing = await prisma.patientAddress.count({ where: { patientId, isActive: true } });
  if (existing > 0) return;

  const user = await prisma.user.findFirst({
    where: { id: patientId, role: Role.PATIENT },
    select: {
      name: true,
      mobile: true,
      alternateMobile: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      pincode: true,
      country: true
    }
  });

  if (!user?.addressLine1?.trim()) return;

  await prisma.patientAddress.create({
    data: {
      patientId,
      label: 'Home',
      addressType: PatientAddressType.HOME,
      recipientName: user.name,
      phone: normalizePhone(user.alternateMobile || user.mobile || ''),
      addressLine1: user.addressLine1.trim(),
      addressLine2: user.addressLine2?.trim() || null,
      city: user.city?.trim() || '—',
      state: user.state?.trim() || '—',
      pincode: user.pincode?.trim() || '000000',
      country: user.country?.trim() || 'India',
      isDefault: true
    }
  });
}

async function clearOtherDefaults(patientId: string, exceptId?: string) {
  await prisma.patientAddress.updateMany({
    where: { patientId, isActive: true, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    data: { isDefault: false }
  });
}

export async function listPatientAddresses(patientId: string) {
  await ensureLegacyAddressMigrated(patientId);
  const addresses = await prisma.patientAddress.findMany({
    where: { patientId, isActive: true },
    select: patientAddressSelect,
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
  });
  return addresses.map((a) => ({ ...a, formatted: formatPatientAddress(a) }));
}

export async function getPatientAddressForPatient(patientId: string, addressId: string) {
  return prisma.patientAddress.findFirst({
    where: { id: addressId, patientId, isActive: true },
    select: patientAddressSelect
  });
}

export async function getDefaultPatientAddress(patientId: string) {
  await ensureLegacyAddressMigrated(patientId);
  return prisma.patientAddress.findFirst({
    where: { patientId, isActive: true, isDefault: true },
    select: patientAddressSelect
  });
}

export async function createPatientAddress(patientId: string, input: PatientAddressInput) {
  const count = await prisma.patientAddress.count({ where: { patientId, isActive: true } });
  if (count >= MAX_PATIENT_ADDRESSES) {
    throw new Error(`You can save up to ${MAX_PATIENT_ADDRESSES} addresses.`);
  }

  const phone = normalizePhone(input.phone);
  const makeDefault = input.isDefault ?? count === 0;

  if (makeDefault) {
    await clearOtherDefaults(patientId);
  }

  const address = await prisma.patientAddress.create({
    data: {
      patientId,
      label: input.label,
      addressType: input.addressType as PatientAddressType,
      recipientName: input.recipientName,
      phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 || null,
      landmark: input.landmark || null,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      country: input.country || 'India',
      deliveryInstructions: input.deliveryInstructions || null,
      isDefault: makeDefault
    },
    select: patientAddressSelect
  });

  return { ...address, formatted: formatPatientAddress(address) };
}

export async function updatePatientAddress(patientId: string, addressId: string, input: PatientAddressInput) {
  const existing = await getPatientAddressForPatient(patientId, addressId);
  if (!existing) throw new Error('Address not found.');

  const phone = normalizePhone(input.phone);
  const makeDefault = input.isDefault ?? existing.isDefault;

  if (makeDefault) {
    await clearOtherDefaults(patientId, addressId);
  }

  const address = await prisma.patientAddress.update({
    where: { id: addressId },
    data: {
      label: input.label,
      addressType: input.addressType as PatientAddressType,
      recipientName: input.recipientName,
      phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 || null,
      landmark: input.landmark || null,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      country: input.country || 'India',
      deliveryInstructions: input.deliveryInstructions || null,
      isDefault: makeDefault
    },
    select: patientAddressSelect
  });

  return { ...address, formatted: formatPatientAddress(address) };
}

export async function setDefaultPatientAddress(patientId: string, addressId: string) {
  const existing = await getPatientAddressForPatient(patientId, addressId);
  if (!existing) throw new Error('Address not found.');

  await clearOtherDefaults(patientId, addressId);
  const address = await prisma.patientAddress.update({
    where: { id: addressId },
    data: { isDefault: true },
    select: patientAddressSelect
  });
  return { ...address, formatted: formatPatientAddress(address) };
}

export async function deletePatientAddress(patientId: string, addressId: string) {
  const existing = await getPatientAddressForPatient(patientId, addressId);
  if (!existing) throw new Error('Address not found.');

  await prisma.patientAddress.update({
    where: { id: addressId },
    data: { isActive: false, isDefault: false }
  });

  if (existing.isDefault) {
    const next = await prisma.patientAddress.findFirst({
      where: { patientId, isActive: true },
      orderBy: { updatedAt: 'desc' }
    });
    if (next) {
      await prisma.patientAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
}

export async function resolveDeliveryAddressInput(input: {
  patientId: string;
  patientAddressId?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
}) {
  if (input.patientAddressId) {
    const addr = await getPatientAddressForPatient(input.patientId, input.patientAddressId);
    if (!addr) throw new Error('Saved address not found for this patient.');
    return {
      patientAddressId: addr.id,
      deliveryAddress: formatPatientAddress(addr),
      deliveryPhone: addr.phone
    };
  }

  if (!input.deliveryAddress?.trim() || !input.deliveryPhone?.trim()) {
    const fallback = await getDefaultPatientAddress(input.patientId);
    if (fallback) {
      return {
        patientAddressId: fallback.id,
        deliveryAddress: formatPatientAddress(fallback),
        deliveryPhone: fallback.phone
      };
    }
    throw new Error('Delivery address and phone are required.');
  }

  return {
    patientAddressId: null as string | null,
    deliveryAddress: input.deliveryAddress.trim(),
    deliveryPhone: normalizePhone(input.deliveryPhone)
  };
}
