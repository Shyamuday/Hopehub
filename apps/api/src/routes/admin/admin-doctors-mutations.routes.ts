import type express from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { allowRoles, authRequired } from '../../auth.js';
import { prisma } from '../../db.js';
import { publicUserSelect } from '../../db/prisma-includes.js';
import { asyncRoute } from '../../middleware/async-route.js';
import { writeAuditLog } from '../../lib/audit.js';
import { routeParam } from '../../lib/http-params.js';
import { PERMISSIONS, requirePermissions } from '../../staff-permissions.js';

export function registerAdminDoctorMutationRoutes(app: express.Application) {
  app.post(
    '/admin/doctors/:id/approve',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.DOCTORS_WRITE),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const doctor = await prisma.user.update({
        where: { id: doctorId },
        data: { isActive: true },
        select: { ...publicUserSelect, isActive: true, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.approve',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Doctor approved by admin.'
      });

      res.json({ doctor, message: 'Doctor approved successfully.' });
    })
  );

  app.post(
    '/admin/doctors/:id/reject',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.DOCTORS_WRITE),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const doctor = await prisma.user.update({
        where: { id: doctorId },
        data: { isActive: false },
        select: { ...publicUserSelect, isActive: true, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.reject',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Doctor marked pending/inactive by admin.'
      });

      res.json({ doctor, message: 'Doctor marked as not approved.' });
    })
  );

  app.post(
    '/admin/doctors/:id/status',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.DOCTORS_WRITE),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const body = z.object({ isActive: z.boolean() }).parse(req.body);
      const existing = await prisma.user.findFirst({
        where: { id: doctorId, role: Role.DOCTOR },
        select: { id: true }
      });
      if (!existing) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      const doctor = await prisma.user.update({
        where: { id: doctorId },
        data: { isActive: body.isActive },
        select: { ...publicUserSelect, isActive: true, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: body.isActive ? 'doctor.activate' : 'doctor.deactivate',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: body.isActive ? 'Doctor activated by admin.' : 'Doctor deactivated by admin.'
      });

      res.json({
        doctor,
        message: body.isActive ? 'Doctor activated successfully.' : 'Doctor deactivated successfully.'
      });
    })
  );

  app.post(
    '/admin/doctors',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.DOCTORS_WRITE),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().min(8).optional(),
          password: z.string().min(8),
          specialty: z.string().min(2),
          registrationNo: z.string().optional()
        })
        .parse(req.body);

      const passwordHash = await bcrypt.hash(body.password, 10);
      const doctor = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          mobile: body.mobile,
          passwordHash,
          role: Role.DOCTOR,
          doctorProfile: {
            create: {
              specialty: body.specialty,
              registrationNo: body.registrationNo
            }
          }
        },
        select: { ...publicUserSelect, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.create',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Doctor account created by admin.',
        metadata: { specialty: body.specialty }
      });

      res.status(201).json({ doctor });
    })
  );

  app.put(
    '/admin/doctors/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.DOCTORS_WRITE),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().min(8).optional().or(z.literal('')),
          specialty: z.string().min(2),
          registrationNo: z.string().optional().or(z.literal('')),
          isAvailable: z.boolean().optional().default(true)
        })
        .parse(req.body);

      const existing = await prisma.user.findFirst({
        where: { id: doctorId, role: Role.DOCTOR },
        select: { id: true }
      });
      if (!existing) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      const doctor = await prisma.user.update({
        where: { id: doctorId },
        data: {
          name: body.name,
          email: body.email,
          mobile: body.mobile || null,
          doctorProfile: {
            upsert: {
              create: {
                specialty: body.specialty,
                registrationNo: body.registrationNo || null,
                isAvailable: body.isAvailable
              },
              update: {
                specialty: body.specialty,
                registrationNo: body.registrationNo || null,
                isAvailable: body.isAvailable
              }
            }
          }
        },
        select: { ...publicUserSelect, isActive: true, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.update',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Doctor profile updated by admin.',
        metadata: { isAvailable: body.isAvailable, specialty: body.specialty }
      });

      res.json({ doctor, message: 'Doctor profile updated successfully.' });
    })
  );
}
