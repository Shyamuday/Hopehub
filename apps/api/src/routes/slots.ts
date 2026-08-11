import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { providerPublicReadiness, requireDoctorCapability } from '../doctor-capabilities.js';
import { prisma } from '../db.js';
import { asyncRoute, routeParam, queryText } from '../utils/helpers.js';
import {
  defaultGenerationRange,
  generateSlotsForAvailabilityRule,
  minutesBetween
} from '../services/provider-availability.js';

export const router = Router();

router.use(
  '/doctor/slots',
  authRequired,
  allowRoles(Role.DOCTOR),
  requireDoctorCapability('slots', 'Slot management is not available for your provider type.')
);

router.use(
  '/doctor/availability-rules',
  authRequired,
  allowRoles(Role.DOCTOR),
  requireDoctorCapability('slots', 'Availability rules are not available for your provider type.')
);

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

async function currentDoctor(userId: string) {
  return prisma.doctor.findUnique({
    where: { userId },
    select: {
      id: true,
      mentalHealthProfile: {
        select: {
          services: {
            where: { isActive: true },
            select: { id: true, title: true, durationMinutes: true, pricingMode: true },
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
          }
        }
      }
    }
  });
}

async function requireBookingReady(userId: string, res: Response) {
  const readiness = await providerPublicReadiness(userId);
  if (readiness.ready) return true;
  res.status(409).json({ message: readiness.message, code: readiness.code });
  return false;
}

// GET /doctor/slots?date=YYYY-MM-DD — doctor views their own slots
router.get(
  '/doctor/slots',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const dateStr = queryText(req, 'date');
    const doctor = await currentDoctor(req.user!.id);
    if (!doctor) return res.status(404).json({ message: 'Provider profile not found' });

    const where = dateStr
      ? { doctorId: doctor.id, date: new Date(dateStr) }
      : { doctorId: doctor.id };

    const [slots, rules] = await Promise.all([
      prisma.doctorSlot.findMany({
        where,
        include: { careTeamService: { select: { id: true, title: true, durationMinutes: true } } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
      }),
      prisma.providerAvailabilityRule.findMany({
        where: { doctorId: doctor.id },
        include: { careTeamService: { select: { id: true, title: true, durationMinutes: true } } },
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }]
      })
    ]);
    res.json({ slots, rules, services: doctor.mentalHealthProfile?.services ?? [] });
  })
);

router.post(
  '/doctor/availability-rules',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        label: z.string().trim().min(2).max(120),
        weekday: z.number().int().min(0).max(6),
        startTime: timeSchema,
        endTime: timeSchema,
        slotDurationMinutes: z.number().int().min(10).max(240).default(30),
        bufferMinutes: z.number().int().min(0).max(120).default(0),
        maxSessionsPerDay: z.number().int().min(1).max(30).optional().nullable(),
        startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endsOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        careTeamServiceId: z.string().trim().optional().nullable(),
        generateNow: z.boolean().optional().default(true)
      })
      .parse(req.body);
    if (body.endTime <= body.startTime) {
      return res.status(400).json({ message: 'End time must be after start time.' });
    }
    if (!(await requireBookingReady(req.user!.id, res))) return;
    const doctor = await currentDoctor(req.user!.id);
    if (!doctor) return res.status(404).json({ message: 'Provider profile not found' });
    const careTeamServiceId = body.careTeamServiceId || null;
    if (
      careTeamServiceId &&
      !doctor.mentalHealthProfile?.services.some((service) => service.id === careTeamServiceId)
    ) {
      return res.status(400).json({ message: 'Selected service does not belong to your profile.' });
    }
    const rule = await prisma.providerAvailabilityRule.create({
      data: {
        doctorId: doctor.id,
        careTeamServiceId,
        label: body.label,
        weekday: body.weekday,
        startTime: body.startTime,
        endTime: body.endTime,
        slotDurationMinutes: body.slotDurationMinutes,
        bufferMinutes: body.bufferMinutes,
        maxSessionsPerDay: body.maxSessionsPerDay ?? null,
        startsOn: new Date(body.startsOn),
        endsOn: body.endsOn ? new Date(body.endsOn) : null
      },
      include: { careTeamService: { select: { id: true, title: true, durationMinutes: true } } }
    });
    const generated = body.generateNow
      ? await generateSlotsForAvailabilityRule(
          rule.id,
          defaultGenerationRange().from,
          defaultGenerationRange().to
        )
      : { generated: 0, skipped: 0 };
    res.status(201).json({ rule, generated });
  })
);

router.post(
  '/doctor/availability-rules/:id/generate',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const doctor = await currentDoctor(req.user!.id);
    if (!doctor) return res.status(404).json({ message: 'Provider profile not found' });
    if (!(await requireBookingReady(req.user!.id, res))) return;
    const rule = await prisma.providerAvailabilityRule.findFirst({
      where: { id: routeParam(req, 'id'), doctorId: doctor.id },
      select: { id: true }
    });
    if (!rule) return res.status(404).json({ message: 'Availability rule not found.' });
    const generated = await generateSlotsForAvailabilityRule(
      rule.id,
      defaultGenerationRange().from,
      defaultGenerationRange().to
    );
    res.json({ generated });
  })
);

router.delete(
  '/doctor/availability-rules/:id',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const doctor = await currentDoctor(req.user!.id);
    if (!doctor) return res.status(404).json({ message: 'Provider profile not found' });
    if (!(await requireBookingReady(req.user!.id, res))) return;
    await prisma.providerAvailabilityRule.update({
      where: { id: routeParam(req, 'id'), doctorId: doctor.id },
      data: { isActive: false }
    });
    res.json({ ok: true });
  })
);

// POST /doctor/slots — doctor creates/opens a slot
router.post(
  '/doctor/slots',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        date: z.string().min(1),
        startTime: timeSchema,
        endTime: timeSchema,
        careTeamServiceId: z.string().trim().optional().nullable(),
        bufferMinutes: z.number().int().min(0).max(120).optional().default(0)
      })
      .parse(req.body);

    const doctor = await currentDoctor(req.user!.id);
    if (!doctor) return res.status(404).json({ message: 'Provider profile not found' });
    const careTeamServiceId = body.careTeamServiceId || null;
    if (
      careTeamServiceId &&
      !doctor.mentalHealthProfile?.services.some((service) => service.id === careTeamServiceId)
    ) {
      return res.status(400).json({ message: 'Selected service does not belong to your profile.' });
    }

    const slot = await prisma.doctorSlot.upsert({
      where: {
        doctorId_date_startTime: {
          doctorId: doctor.id,
          date: new Date(body.date),
          startTime: body.startTime
        }
      },
      create: {
        doctorId: doctor.id,
        careTeamServiceId,
        date: new Date(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        bufferMinutes: body.bufferMinutes,
        isBlocked: false
      },
      update: {
        careTeamServiceId,
        endTime: body.endTime,
        bufferMinutes: body.bufferMinutes,
        isBlocked: false
      }
    });
    res.status(201).json({ slot });
  })
);

// PATCH /doctor/slots/:id — toggle blocked
router.patch(
  '/doctor/slots/:id',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user!.id },
      select: { id: true }
    });
    if (!doctor) return res.status(404).json({ message: 'Provider profile not found' });

    const slot = await prisma.doctorSlot.update({
      where: { id: routeParam(req, 'id'), doctorId: doctor.id },
      data: { isBlocked: req.body.isBlocked ?? false }
    });
    res.json({ slot });
  })
);

// DELETE /doctor/slots/:id
router.delete(
  '/doctor/slots/:id',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user!.id },
      select: { id: true }
    });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

    await prisma.doctorSlot.delete({ where: { id: routeParam(req, 'id'), doctorId: doctor.id } });
    res.json({ ok: true });
  })
);

// GET /doctors/:id/slots?date=YYYY-MM-DD — patient views available slots for a doctor
router.get(
  '/doctors/:id/slots',
  authRequired,
  asyncRoute(async (req, res) => {
    const dateStr = queryText(req, 'date');
    const doctor = await prisma.doctor.findUnique({
      where: { id: routeParam(req, 'id') },
      select: {
        id: true,
        userId: true,
        showOnWebsite: true,
        suspendedAt: true,
        user: { select: { isActive: true } }
      }
    });
    if (!doctor) return res.status(404).json({ message: 'Provider not found' });
    const readiness = await providerPublicReadiness(doctor.userId);
    if (!doctor.showOnWebsite || doctor.suspendedAt || !doctor.user.isActive || !readiness.ready) {
      return res.status(404).json({ message: 'Provider is not accepting bookings right now.' });
    }

    const where = {
      doctorId: doctor.id,
      isBooked: false,
      isBlocked: false,
      ...(dateStr ? { date: new Date(dateStr) } : {})
    };

    const serviceId = queryText(req, 'careTeamServiceId').trim();
    const service = serviceId
      ? await prisma.careTeamService.findFirst({
          where: { id: serviceId, mentalHealthProfile: { doctorId: doctor.id }, isActive: true },
          select: { id: true, durationMinutes: true }
        })
      : null;
    if (serviceId && !service) {
      return res.status(404).json({ message: 'Service not found for this doctor.' });
    }

    const slots = await prisma.doctorSlot.findMany({
      where,
      select: { id: true, date: true, startTime: true, endTime: true, careTeamServiceId: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    });
    res.json({
      slots: slots.filter((slot) => {
        if (serviceId && slot.careTeamServiceId && slot.careTeamServiceId !== serviceId)
          return false;
        if (service && minutesBetween(slot.startTime, slot.endTime) < service.durationMinutes)
          return false;
        return true;
      })
    });
  })
);
