import crypto from 'node:crypto';
import express from 'express';
import { Prisma, Role } from '@prisma/client';
import { signToken } from '../auth.js';
import { prisma } from '../db.js';

// ── Request helpers ────────────────────────────────────────────────────────────

export const asyncRoute =
  (handler: express.RequestHandler): express.RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

export function routeParam(req: express.Request, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function queryText(req: express.Request, key: string) {
  const value = req.query[key];
  if (Array.isArray(value)) return String(value[0] || '');
  return typeof value === 'string' ? value : '';
}

export function queryPositiveInt(req: express.Request, key: string, fallback: number, min = 1, max = 100) {
  const parsed = Number(queryText(req, key));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

// ── Auth helpers ───────────────────────────────────────────────────────────────

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  role: true,
  patientCode: true,
  homeClinicStoreId: true
} as const;

export function toAuthResponse(user: {
  id: string;
  name: string;
  role: Role;
  email?: string | null;
  mobile?: string | null;
  patientCode?: string | null;
}) {
  return { token: signToken(user), user };
}

export const patientProfileSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  patientCode: true,
  homeClinicStoreId: true,
  homeClinicStore: { select: { id: true, name: true, code: true, address: true } },
  allergies: true,
  currentMedications: true,
  chronicConditions: true
} as const;

export function logAuthEvent(
  event: 'staff_login_success' | 'staff_login_failure' | 'patient_login',
  details: Record<string, unknown>
) {
  console.info(`[auth] ${event}`, { at: new Date().toISOString(), ...details });
}

// ── Crypto helpers ─────────────────────────────────────────────────────────────

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ── Audit ──────────────────────────────────────────────────────────────────────

export async function writeAuditLog(input: {
  actorId?: string;
  actorRole?: Role;
  action: string;
  targetType: string;
  targetId: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId || null,
      actorRole: input.actorRole || null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      metadata: input.metadata as Prisma.InputJsonValue | undefined
    }
  });
}

// ── Query include helpers ──────────────────────────────────────────────────────

export function includeConsultationRelations() {
  return {
    patient: { select: publicUserSelect },
    assignedDoctor: { select: publicUserSelect },
    disease: true,
    payment: true,
    prescriptions: {
      include: {
        items: { orderBy: { sortOrder: 'asc' as const } },
        methodOption: true,
        diagnosedDiseaseOption: true
      },
      orderBy: { version: 'desc' as const }
    },
    messages: {
      include: { sender: { select: publicUserSelect } },
      orderBy: { createdAt: 'asc' as const }
    }
  };
}

export function includePrescriptionRelations() {
  return {
    consultation: {
      select: {
        id: true,
        patientId: true,
        assignedDoctorId: true,
        disease: { select: { id: true, name: true } }
      }
    },
    uploadedBy: { select: publicUserSelect },
    patient: { select: publicUserSelect },
    methodOption: true,
    diagnosedDiseaseOption: true,
    items: { orderBy: { sortOrder: 'asc' as const } }
  };
}

// ── Domain helpers ─────────────────────────────────────────────────────────────

export function normalizeOptionLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function fallbackIntakeTimesFromFrequency(frequency?: string | null) {
  const value = (frequency || '').toLowerCase();
  if (value.includes('three') || value.includes('thrice') || value.includes('3')) {
    return ['08:00', '14:00', '20:00'];
  }
  if (value.includes('twice') || value.includes('2')) return ['09:00', '21:00'];
  return ['09:00'];
}

export function buildDoseScheduleEvents(input: {
  patientId: string;
  prescriptionId: string;
  prescriptionItems: Array<{ id: string; frequency?: string | null; durationDays?: number | null; intakeTimes?: unknown }>;
}) {
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const events: Array<{
    patientId: string;
    prescriptionId: string;
    prescriptionItemId: string;
    scheduledFor: Date;
  }> = [];

  for (const item of input.prescriptionItems) {
    const rawTimes = Array.isArray(item.intakeTimes) ? item.intakeTimes.filter((t) => typeof t === 'string') : [];
    const times = rawTimes.length ? (rawTimes as string[]) : fallbackIntakeTimesFromFrequency(item.frequency);
    const durationDays = Math.min(Math.max(item.durationDays || 1, 1), 120);

    for (let dayOffset = 0; dayOffset < durationDays; dayOffset += 1) {
      for (const time of times) {
        const [hourText, minuteText] = time.split(':');
        const hour = Number(hourText);
        const minute = Number(minuteText);
        if (Number.isNaN(hour) || Number.isNaN(minute)) continue;

        const scheduledFor = new Date(dayStart);
        scheduledFor.setDate(dayStart.getDate() + dayOffset);
        scheduledFor.setHours(hour, minute, 0, 0);

        events.push({
          patientId: input.patientId,
          prescriptionId: input.prescriptionId,
          prescriptionItemId: item.id,
          scheduledFor
        });
      }
    }
  }

  return events;
}
