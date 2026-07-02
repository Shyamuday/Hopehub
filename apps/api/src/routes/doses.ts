import { Router } from 'express';
import { z } from 'zod';
import { DoseEventStatus, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { DEFAULT_REMINDER_PREFERENCE } from '../constants/reminder-preferences.constants.js';
import { asyncRoute, routeParam, queryPositiveInt } from '../utils/helpers.js';
import { doctorCanAccessPatient } from '../services/patient-identity.js';

export const router = Router();

// ─── Patient dose endpoints ────────────────────────────────────────────────────

router.get(
  '/patient/today-doses',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const doses = await prisma.medicineDoseEvent.findMany({
      where: { patientId: req.user!.id, scheduledFor: { gte: start, lt: end } },
      include: {
        prescriptionItem: true,
        prescription: { include: { methodOption: true, diagnosedDiseaseOption: true } }
      },
      orderBy: { scheduledFor: 'asc' }
    });

    res.json({ doses });
  })
);

router.get(
  '/patient/reminder-preferences',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const stored = await prisma.reminderPreference.findUnique({
      where: { userId: req.user!.id },
      select: { inApp: true, sms: true, whatsapp: true, push: true, quietHoursStart: true, quietHoursEnd: true }
    });
    res.json({ preferences: stored || DEFAULT_REMINDER_PREFERENCE });
  })
);

router.put(
  '/patient/reminder-preferences',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        inApp: z.boolean(),
        sms: z.boolean(),
        whatsapp: z.boolean(),
        push: z.boolean(),
        quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
        quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/)
      })
      .parse(req.body);

    await prisma.reminderPreference.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...body },
      update: body
    });

    res.json({ preferences: body, message: 'Reminder preferences saved.' });
  })
);

router.post(
  '/patient/dose-events/:id/take',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const event = await prisma.medicineDoseEvent.findUnique({ where: { id: routeParam(req, 'id') } });
    if (!event || event.patientId !== req.user!.id) {
      return res.status(404).json({ message: 'Dose event not found' });
    }

    const updated = await prisma.medicineDoseEvent.update({
      where: { id: event.id },
      data: { status: DoseEventStatus.TAKEN, takenAt: new Date() }
    });

    res.json({ doseEvent: updated });
  })
);

router.post(
  '/patient/dose-events/:id/snooze',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z.object({ minutes: z.number().int().min(5).max(120).optional() }).parse(req.body);
    const event = await prisma.medicineDoseEvent.findUnique({ where: { id: routeParam(req, 'id') } });

    if (!event || event.patientId !== req.user!.id) {
      return res.status(404).json({ message: 'Dose event not found' });
    }
    if (event.status !== DoseEventStatus.PENDING) {
      return res.status(400).json({ message: 'Only pending doses can be snoozed.' });
    }

    const minutes = body.minutes || 15;
    const scheduledFor = new Date(event.scheduledFor.getTime() + minutes * 60 * 1000);
    const updated = await prisma.medicineDoseEvent.update({
      where: { id: event.id },
      data: { scheduledFor, note: `Snoozed by ${minutes} min at ${new Date().toISOString()}` }
    });

    res.json({ doseEvent: updated, message: `Dose snoozed by ${minutes} minutes.` });
  })
);

router.post(
  '/patient/dose-events/:id/skip',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z.object({ note: z.string().max(300).optional() }).parse(req.body);
    const event = await prisma.medicineDoseEvent.findUnique({ where: { id: routeParam(req, 'id') } });

    if (!event || event.patientId !== req.user!.id) {
      return res.status(404).json({ message: 'Dose event not found' });
    }

    const updated = await prisma.medicineDoseEvent.update({
      where: { id: event.id },
      data: { status: DoseEventStatus.SKIPPED, skippedAt: new Date(), note: body.note }
    });

    res.json({ doseEvent: updated });
  })
);

// ─── Doctor / Admin dose views ─────────────────────────────────────────────────

router.get(
  '/doctor/patients/:id/adherence-summary',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');
    if (req.user!.role === Role.DOCTOR) {
      const allowed = await doctorCanAccessPatient(req.user!.id, patientId);
      if (!allowed) return res.status(403).json({ message: 'Access denied' });
    }

    const [total, taken, skipped, missed] = await Promise.all([
      prisma.medicineDoseEvent.count({ where: { patientId } }),
      prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.TAKEN } }),
      prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.SKIPPED } }),
      prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.MISSED } })
    ]);

    const adherencePercent = total ? Math.round((taken / total) * 100) : 0;
    res.json({ patientId, totals: { total, taken, skipped, missed }, adherencePercent });
  })
);

router.get(
  '/doctor/patients/:id/adherence-trend',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');
    const days = queryPositiveInt(req, 'days', 7, 1, 30);

    if (req.user!.role === Role.DOCTOR) {
      const allowed = await doctorCanAccessPatient(req.user!.id, patientId);
      if (!allowed) return res.status(403).json({ message: 'Access denied' });
    }

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const events = await prisma.medicineDoseEvent.findMany({
      where: { patientId, scheduledFor: { gte: start, lte: end } },
      select: { scheduledFor: true, status: true }
    });

    const trendMap = new Map<
      string,
      { date: string; total: number; taken: number; skipped: number; missed: number; pending: number; adherencePercent: number }
    >();
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      trendMap.set(key, { date: key, total: 0, taken: 0, skipped: 0, missed: 0, pending: 0, adherencePercent: 0 });
    }

    for (const event of events) {
      const key = event.scheduledFor.toISOString().slice(0, 10);
      const day = trendMap.get(key);
      if (!day) continue;
      day.total += 1;
      if (event.status === DoseEventStatus.TAKEN) day.taken += 1;
      else if (event.status === DoseEventStatus.SKIPPED) day.skipped += 1;
      else if (event.status === DoseEventStatus.MISSED) day.missed += 1;
      else day.pending += 1;
    }

    const trend = Array.from(trendMap.values()).map((day) => ({
      ...day,
      adherencePercent: day.total ? Math.round((day.taken / day.total) * 100) : 0
    }));
    const totals = trend.reduce(
      (acc, day) => {
        acc.total += day.total;
        acc.taken += day.taken;
        acc.skipped += day.skipped;
        acc.missed += day.missed;
        acc.pending += day.pending;
        return acc;
      },
      { total: 0, taken: 0, skipped: 0, missed: 0, pending: 0 }
    );

    res.json({
      patientId,
      days,
      totals,
      adherencePercent: totals.total ? Math.round((totals.taken / totals.total) * 100) : 0,
      trend
    });
  })
);

router.get(
  '/doctor/patients/:id/dose-events',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');
    const days = queryPositiveInt(req, 'days', 7, 1, 30);

    if (req.user!.role === Role.DOCTOR) {
      const allowed = await doctorCanAccessPatient(req.user!.id, patientId);
      if (!allowed) return res.status(403).json({ message: 'Access denied' });
    }

    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const events = await prisma.medicineDoseEvent.findMany({
      where: {
        patientId,
        status: { in: [DoseEventStatus.SKIPPED, DoseEventStatus.MISSED] },
        scheduledFor: { gte: since }
      },
      select: {
        id: true,
        status: true,
        scheduledFor: true,
        skippedAt: true,
        note: true,
        prescriptionItem: { select: { medicineName: true } }
      },
      orderBy: { scheduledFor: 'desc' },
      take: 50
    });

    res.json({
      patientId,
      days,
      events: events.map((e) => ({
        id: e.id,
        status: e.status,
        scheduledFor: e.scheduledFor,
        interactedAt: e.skippedAt ?? null,
        note: e.note ?? null,
        medicineName: e.prescriptionItem.medicineName
      }))
    });
  })
);
