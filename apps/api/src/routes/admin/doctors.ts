import { Router } from 'express';
import { z } from 'zod';
import {
  CareTeamMemberType,
  CareTeamServicePricingMode,
  HomeopathicDoctorType,
  Role
} from '@prisma/client';
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
import { PSYCHOLOGIST_CONSULTATION_SHARE_PERCENT } from '../../services/doctor-compensation.js';

const textArraySchema = z.array(z.string().trim().min(1).max(160)).max(40).optional();
const careTeamServiceSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable().or(z.literal('')),
  pricingMode: z
    .nativeEnum(CareTeamServicePricingMode)
    .optional()
    .default(CareTeamServicePricingMode.FIXED),
  priceInPaise: z.number().int().min(0).max(500000).optional().default(0),
  firstSessionPriceInPaise: z.number().int().min(0).max(500000).optional().nullable(),
  followUpPriceInPaise: z.number().int().min(0).max(500000).optional().nullable(),
  introSessionLimit: z.number().int().min(1).max(20).optional().default(1),
  packageSessionCount: z.number().int().min(1).max(100).optional().nullable(),
  packagePriceInPaise: z.number().int().min(0).max(5000000).optional().nullable(),
  currency: z.string().trim().max(8).optional().default('INR'),
  durationMinutes: z.number().int().min(5).max(240).optional().default(30),
  isFree: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(999).optional().default(0)
});
const mentalHealthProfileSchema = z
  .object({
    careTeamType: z.nativeEnum(CareTeamMemberType).optional(),
    qualifications: textArraySchema,
    qualifiedFrom: z.string().trim().max(240).optional().nullable().or(z.literal('')),
    licenseNumber: z.string().trim().max(120).optional().nullable().or(z.literal('')),
    licenseCouncil: z.string().trim().max(160).optional().nullable().or(z.literal('')),
    languages: textArraySchema,
    modalities: textArraySchema,
    sessionTypes: textArraySchema,
    ageGroups: textArraySchema,
    concernsHandled: textArraySchema,
    introSessionTitle: z.string().trim().max(180).optional().nullable().or(z.literal('')),
    counsellingApproach: z.string().trim().max(4000).optional().nullable().or(z.literal('')),
    safetyEscalationNote: z.string().trim().max(2000).optional().nullable().or(z.literal('')),
    acceptsHighRiskCases: z.boolean().optional(),
    services: z.array(careTeamServiceSchema).max(20).optional()
  })
  .optional();

function compactTextArray(items?: string[]) {
  return (items ?? []).map((item) => item.trim()).filter(Boolean);
}

function toMentalHealthProfilePayload(body: z.infer<typeof mentalHealthProfileSchema>) {
  const services = (body?.services ?? []).map((service, index) => ({
    title: service.title,
    description: service.description || null,
    pricingMode: service.pricingMode ?? CareTeamServicePricingMode.FIXED,
    priceInPaise: service.isFree ? 0 : (service.priceInPaise ?? 0),
    firstSessionPriceInPaise: service.firstSessionPriceInPaise ?? null,
    followUpPriceInPaise: service.followUpPriceInPaise ?? null,
    introSessionLimit: service.introSessionLimit ?? 1,
    packageSessionCount: service.packageSessionCount ?? null,
    packagePriceInPaise: service.packagePriceInPaise ?? null,
    currency: service.currency || 'INR',
    durationMinutes: service.durationMinutes ?? 30,
    isFree: service.isFree ?? (service.priceInPaise ?? 0) === 0,
    isActive: service.isActive ?? true,
    sortOrder: service.sortOrder ?? index
  }));
  return {
    careTeamType: body?.careTeamType ?? CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL,
    qualifications: compactTextArray(body?.qualifications),
    qualifiedFrom: body?.qualifiedFrom || null,
    licenseNumber: body?.licenseNumber || null,
    licenseCouncil: body?.licenseCouncil || null,
    languages: compactTextArray(body?.languages),
    modalities: compactTextArray(body?.modalities),
    sessionTypes: compactTextArray(body?.sessionTypes),
    ageGroups: compactTextArray(body?.ageGroups),
    concernsHandled: compactTextArray(body?.concernsHandled),
    introSessionTitle: body?.introSessionTitle || null,
    counsellingApproach: body?.counsellingApproach || null,
    safetyEscalationNote: body?.safetyEscalationNote || null,
    acceptsHighRiskCases: body?.acceptsHighRiskCases ?? false,
    services
  };
}

function mentalHealthProfileCreatePayload(
  payload: ReturnType<typeof toMentalHealthProfilePayload>
) {
  const { services, ...profile } = payload;
  return {
    ...profile,
    services: services.length ? { create: services } : undefined
  };
}

function mentalHealthProfileUpdatePayload(
  payload: ReturnType<typeof toMentalHealthProfilePayload>
) {
  const { services, ...profile } = payload;
  return {
    ...profile,
    services: {
      deleteMany: {},
      ...(services.length ? { create: services } : {})
    }
  };
}

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
        select: {
          ...publicUserSelect,
          isActive: true,
          createdAt: true,
          doctorProfile: { select: doctorProfileSelect }
        },
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
        select: {
          ...publicUserSelect,
          isActive: true,
          createdAt: true,
          doctorProfile: { select: doctorProfileSelect }
        },
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
          registrationNo: z.string().optional(),
          designation: z.string().optional().or(z.literal('')),
          department: z.string().optional().or(z.literal('')),
          mentalHealthProfile: mentalHealthProfileSchema
        })
        .merge(doctorProfileSchema())
        .parse(req.body);

      const passwordHash = await bcrypt.hash(body.password, 10);
      const profilePayload = toDoctorProfilePayload(body);
      const hrFields = applyDoctorHrProfileFields({
        doctorType: profilePayload.doctorType,
        specialtyFocus: profilePayload.specialtyFocus,
        specialty: profilePayload.specialty,
        designation: body.designation,
        department: body.department
      });
      const compensationFields =
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
          ? { consultationSharePercent: PSYCHOLOGIST_CONSULTATION_SHARE_PERCENT }
          : {};
      const mentalProfilePayload = toMentalHealthProfilePayload(body.mentalHealthProfile);
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
              department: hrFields.department,
              ...compensationFields,
              ...(profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
                ? {
                    mentalHealthProfile: {
                      create: mentalHealthProfileCreatePayload(mentalProfilePayload)
                    }
                  }
                : {})
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
        metadata: { specialty: profilePayload.specialty, doctorType: profilePayload.doctorType }
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
              registrationNo: true,
              isAvailable: true,
              doctorType: true,
              specialtyFocus: true,
              designation: true,
              department: true,
              mentalHealthProfile: true
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
          designation: z.string().optional().or(z.literal('')),
          department: z.string().optional().or(z.literal('')),
          isAvailable: z.boolean().optional().default(true),
          bio: z.string().max(1200).optional().nullable(),
          showOnWebsite: z.boolean().optional(),
          websiteOrder: z.number().int().min(1).max(999).optional().nullable(),
          yearsOfExperience: z.number().int().min(0).max(60).optional().nullable(),
          focusAreas: z.array(z.string().min(1)).optional(),
          mentalHealthProfile: mentalHealthProfileSchema
        })
        .merge(doctorProfileSchema())
        .parse(req.body);

      const profilePayload = toDoctorProfilePayload(body);
      const hrFields = applyDoctorHrProfileFields({
        doctorType: profilePayload.doctorType,
        specialtyFocus: profilePayload.specialtyFocus,
        specialty: profilePayload.specialty,
        designation: body.designation ?? existing.doctorProfile?.designation,
        department: body.department ?? existing.doctorProfile?.department
      });

      const publicProfileFields = {
        bio: body.bio ?? null,
        showOnWebsite: body.showOnWebsite ?? false,
        websiteOrder: body.websiteOrder ?? null,
        yearsOfExperience: body.yearsOfExperience ?? null,
        focusAreas: (body.focusAreas ?? []).map((f) => f.trim()).filter(Boolean)
      };
      const compensationFields =
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
          ? { consultationSharePercent: PSYCHOLOGIST_CONSULTATION_SHARE_PERCENT }
          : {};
      const mentalProfilePayload = toMentalHealthProfilePayload(body.mentalHealthProfile);
      const mentalHealthProfileCreate =
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
          ? {
              mentalHealthProfile: {
                create: mentalHealthProfileCreatePayload(mentalProfilePayload)
              }
            }
          : {};
      const mentalHealthProfileUpdate =
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
          ? {
              mentalHealthProfile: {
                upsert: {
                  create: mentalHealthProfileCreatePayload(mentalProfilePayload),
                  update: mentalHealthProfileUpdatePayload(mentalProfilePayload)
                }
              }
            }
          : {};

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
                ...compensationFields,
                ...publicProfileFields,
                ...mentalHealthProfileCreate
              },
              update: {
                ...profilePayload,
                designation: hrFields.designation,
                department: hrFields.department,
                isAvailable: profilePayload.isAvailable,
                ...compensationFields,
                ...publicProfileFields,
                ...mentalHealthProfileUpdate
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
            registrationNo: existing.doctorProfile?.registrationNo ?? null,
            isAvailable: existing.doctorProfile?.isAvailable ?? null,
            doctorType: existing.doctorProfile?.doctorType ?? null,
            specialtyFocus: existing.doctorProfile?.specialtyFocus ?? null,
            designation: existing.doctorProfile?.designation ?? null,
            department: existing.doctorProfile?.department ?? null
          },
          after: {
            name: body.name,
            email: body.email,
            mobile: body.mobile || null,
            specialty: profilePayload.specialty,
            registrationNo: profilePayload.registrationNo,
            isAvailable: profilePayload.isAvailable,
            doctorType: profilePayload.doctorType,
            specialtyFocus: profilePayload.specialtyFocus,
            designation: hrFields.designation,
            department: hrFields.department
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
