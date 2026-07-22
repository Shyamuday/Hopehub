import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  asyncRoute,
  routeParam,
  queryText,
  queryPositiveInt,
  publicUserSelect,
  writeAuditLog
} from '../../utils/helpers.js';
import {
  enabledNotificationChannels,
  notificationService
} from '../../services/notification-service.js';
import {
  doctorProfileSchema,
  doctorProfileSelect,
  doctorTypeLabel,
  specialtyFocusLabel,
  toDoctorProfilePayload
} from '../../constants/homeopathic-doctor-types.js';
import {
  applyDoctorHrProfileFields,
  suggestedProbationEndDate
} from '../../constants/doctor-hr-defaults.js';

export function registerAdminDoctorRoutes(router: Router) {
  // ─── Doctors ──────────────────────────────────────────────────────────────────

  router.get(
    '/admin/doctors',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 10);
      const query = queryText(req, 'q').trim();
      const status = queryText(req, 'status').toUpperCase();
      const sortBy = queryText(req, 'sortBy');
      const sortDirection =
        queryText(req, 'sortDirection').toLowerCase() === 'asc' ? 'asc' : 'desc';

      const where = {
        role: Role.DOCTOR,
        ...(status === 'ACTIVE' ? { isActive: true } : {}),
        ...(status === 'INACTIVE' ? { isActive: false } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { email: { contains: query, mode: 'insensitive' as const } },
                { mobile: { contains: query, mode: 'insensitive' as const } },
                { doctorProfile: { specialty: { contains: query, mode: 'insensitive' as const } } }
              ]
            }
          : {})
      };

      const orderBy =
        sortBy === 'name'
          ? ({ name: sortDirection } as const)
          : sortBy === 'status'
            ? ({ isActive: sortDirection } as const)
            : ({ createdAt: sortDirection } as const);

      const total = await prisma.user.count({ where });
      const doctors = await prisma.user.findMany({
        where,
        select: { ...publicUserSelect, isActive: true, createdAt: true, doctorProfile: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({
        doctors,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.get(
    '/admin/doctors/pending',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 10);
      const query = queryText(req, 'q').trim();

      const where = {
        role: Role.DOCTOR,
        isActive: false,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { email: { contains: query, mode: 'insensitive' as const } },
                { mobile: { contains: query, mode: 'insensitive' as const } },
                { doctorProfile: { specialty: { contains: query, mode: 'insensitive' as const } } }
              ]
            }
          : {})
      };

      const total = await prisma.user.count({ where });
      const pendingDoctors = await prisma.user.findMany({
        where,
        select: { ...publicUserSelect, isActive: true, createdAt: true, doctorProfile: true },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({
        pendingDoctors,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.post(
    '/admin/doctors/:id/approve',
    authRequired,
    allowRoles(Role.ADMIN),
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

  router.post(
    '/admin/doctors/:id/reject',
    authRequired,
    allowRoles(Role.ADMIN),
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
        summary: 'Doctor rejected by admin.'
      });
      res.json({ doctor, message: 'Doctor rejected.' });
    })
  );

  router.put(
    '/admin/doctors/:id/status',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const body = z.object({ isActive: z.boolean() }).parse(req.body);
      const doctor = await prisma.user.update({
        where: { id: doctorId },
        data: { isActive: body.isActive },
        select: { ...publicUserSelect, isActive: true, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.status_change',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: body.isActive ? 'Doctor activated by admin.' : 'Doctor deactivated by admin.',
        metadata: { isActive: body.isActive }
      });
      res.json({
        doctor,
        message: body.isActive
          ? 'Doctor activated successfully.'
          : 'Doctor deactivated successfully.'
      });
    })
  );

  router.post(
    '/admin/doctors',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().min(8).optional(),
          password: z.string().min(8),
          specialty: z.string().min(2).optional(),
          registrationNo: z.string().optional()
        })
        .merge(doctorProfileSchema())
        .parse(req.body);

      const passwordHash = await bcrypt.hash(body.password, 10);
      const profilePayload = toDoctorProfilePayload(body);
      const hrFields = applyDoctorHrProfileFields({
        doctorType: profilePayload.doctorType,
        specialtyFocus: profilePayload.specialtyFocus,
        specialty: profilePayload.specialty
      });
      const doctor = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          mobile: body.mobile,
          passwordHash,
          role: Role.DOCTOR,
          doctorProfile: {
            create: {
              ...profilePayload,
              designation: hrFields.designation,
              department: hrFields.department
            }
          }
        },
        select: { ...publicUserSelect, doctorProfile: { select: doctorProfileSelect } }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.create',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Doctor account created by admin.',
        metadata: {
          specialty: profilePayload.specialty,
          doctorType: profilePayload.doctorType,
          providerType: profilePayload.providerType
        }
      });
      res.status(201).json({ doctor });
    })
  );

  router.put(
    '/admin/doctors/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const existing = await prisma.user.findFirst({
        where: { id: doctorId, role: Role.DOCTOR },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          isActive: true,
          doctorProfile: {
            select: {
              specialty: true,
              specialization: true,
              registrationNo: true,
              isAvailable: true,
              providerType: true,
              providerCategory: true,
              doctorType: true,
              specialtyFocus: true,
              designation: true,
              department: true
            }
          }
        }
      });
      if (!existing) return res.status(404).json({ message: 'Doctor not found' });

      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().min(8).optional().or(z.literal('')),
          specialty: z.string().min(2).optional(),
          registrationNo: z.string().optional().or(z.literal('')),
          isAvailable: z.boolean().optional().default(true),
          bio: z.string().max(1200).optional().nullable(),
          showOnWebsite: z.boolean().optional(),
          websiteOrder: z.number().int().min(1).max(999).optional().nullable(),
          yearsOfExperience: z.number().int().min(0).max(60).optional().nullable(),
          focusAreas: z.array(z.string().min(1)).optional()
        })
        .merge(doctorProfileSchema())
        .parse(req.body);

      const profilePayload = toDoctorProfilePayload(body);
      const hrFields = applyDoctorHrProfileFields({
        doctorType: profilePayload.doctorType,
        specialtyFocus: profilePayload.specialtyFocus,
        specialty: profilePayload.specialty,
        designation: existing.doctorProfile?.designation,
        department: existing.doctorProfile?.department
      });

      const publicProfileFields = {
        bio: body.bio ?? null,
        showOnWebsite: body.showOnWebsite ?? false,
        websiteOrder: body.websiteOrder ?? null,
        yearsOfExperience: body.yearsOfExperience ?? null,
        focusAreas: (body.focusAreas ?? []).map((f) => f.trim()).filter(Boolean)
      };

      const doctor = await prisma.user.update({
        where: { id: doctorId },
        data: {
          name: body.name,
          email: body.email,
          mobile: body.mobile || null,
          doctorProfile: {
            upsert: {
              create: {
                ...profilePayload,
                designation: hrFields.designation,
                department: hrFields.department,
                isAvailable: profilePayload.isAvailable,
                ...publicProfileFields
              },
              update: {
                ...profilePayload,
                designation: hrFields.designation,
                department: hrFields.department,
                isAvailable: profilePayload.isAvailable,
                ...publicProfileFields
              }
            }
          }
        },
        select: {
          ...publicUserSelect,
          isActive: true,
          doctorProfile: { select: doctorProfileSelect }
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.update',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Doctor profile updated by admin.',
        metadata: {
          before: {
            name: existing.name,
            email: existing.email,
            mobile: existing.mobile,
            isActive: existing.isActive,
            specialty: existing.doctorProfile?.specialty ?? null,
            specialization: existing.doctorProfile?.specialization ?? null,
            providerType: existing.doctorProfile?.providerType ?? null,
            registrationNo: existing.doctorProfile?.registrationNo ?? null,
            isAvailable: existing.doctorProfile?.isAvailable ?? null,
            doctorType: existing.doctorProfile?.doctorType ?? null,
            specialtyFocus: existing.doctorProfile?.specialtyFocus ?? null
          },
          after: {
            name: body.name,
            email: body.email,
            mobile: body.mobile || null,
            specialty: profilePayload.specialty,
            specialization: profilePayload.specialization,
            providerType: profilePayload.providerType,
            registrationNo: profilePayload.registrationNo,
            isAvailable: profilePayload.isAvailable,
            doctorType: profilePayload.doctorType,
            specialtyFocus: profilePayload.specialtyFocus
          }
        }
      });
      res.json({ doctor, message: 'Doctor profile updated successfully.' });
    })
  );

  /** Set the website display order for a doctor. */
  router.patch(
    '/admin/doctors/:id/website-order',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const { websiteOrder } = z
        .object({ websiteOrder: z.number().int().min(1).max(999).nullable() })
        .parse(req.body);

      await prisma.doctor.update({
        where: { userId: doctorId },
        data: { websiteOrder }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.website_order',
        targetType: 'doctor',
        targetId: doctorId,
        summary:
          websiteOrder != null
            ? `Doctor website order set to ${websiteOrder}.`
            : 'Doctor website order cleared.'
      });

      res.json({ message: 'Website order updated.' });
    })
  );
}
