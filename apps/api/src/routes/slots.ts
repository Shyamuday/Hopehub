import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, routeParam, queryText } from '../utils/helpers.js';

export const router = Router();

// GET /doctor/slots?date=YYYY-MM-DD — doctor views their own slots
router.get(
  '/doctor/slots',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const dateStr = queryText(req, 'date');
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

    const where = dateStr
      ? { doctorId: doctor.id, date: new Date(dateStr) }
      : { doctorId: doctor.id };

    const slots = await prisma.doctorSlot.findMany({ where, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] });
    res.json({ slots });
  })
);

// POST /doctor/slots — doctor creates/opens a slot
router.post(
  '/doctor/slots',
  authRequired,
  allowRoles(Role.DOCTOR),
  asyncRoute(async (req, res) => {
    const body = z
      .object({ date: z.string().min(1), startTime: z.string().min(1), endTime: z.string().min(1) })
      .parse(req.body);

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

    const slot = await prisma.doctorSlot.upsert({
      where: { doctorId_date_startTime: { doctorId: doctor.id, date: new Date(body.date), startTime: body.startTime } },
      create: { doctorId: doctor.id, date: new Date(body.date), startTime: body.startTime, endTime: body.endTime, isBlocked: false },
      update: { endTime: body.endTime, isBlocked: false }
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
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

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
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.id }, select: { id: true } });
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
    const doctor = await prisma.doctor.findUnique({ where: { id: routeParam(req, 'id') }, select: { id: true } });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const where = {
      doctorId: doctor.id,
      isBooked: false,
      isBlocked: false,
      ...(dateStr ? { date: new Date(dateStr) } : {})
    };

    const slots = await prisma.doctorSlot.findMany({
      where,
      select: { id: true, date: true, startTime: true, endTime: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    });
    res.json({ slots });
  })
);
