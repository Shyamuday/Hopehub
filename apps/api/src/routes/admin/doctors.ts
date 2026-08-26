import { Router } from 'express';
import {
  normalizeProviderRoles,
  providerClassificationFromAssignments,
  providerClassificationFromLegacy
} from '@hopehub/contracts';
import { z } from 'zod';
import {
  CareTeamMemberType,
  CareTeamServicePricingMode,
  HomeopathicDoctorType,
  PatientGender,
  Prisma,
  ProviderDomain,
  Role
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authRequired, allowRoles } from '../../auth.js';
import { getAuthorizedAdminWorkspace } from '../../admin-workspace-access.js';
import { staffCanAccessWorkspace } from '../../staff-permissions.js';
import { providerPublicReadiness } from '../../doctor-capabilities.js';
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
  hopeHubCareTeamTypesForSupportPath,
  specialtyFocusLabel,
  toDoctorProfilePayload
} from '../../constants/homeopathic-doctor-types.js';
import {
  applyDoctorHrProfileFields,
  suggestedProbationEndDate
} from '../../constants/doctor-hr-defaults.js';
import { PSYCHOLOGIST_CONSULTATION_SHARE_PERCENT } from '../../services/doctor-compensation.js';
import { syncProviderRoleAssignments } from '../../services/provider-taxonomy.service.js';
import {
  approveHomeopathyProviderAccount,
  HomeopathyProviderApprovalError
} from '../../services/homeopathy-provider-approval.js';
import {
  HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX,
  HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX,
  isHomeopathyCredentialReview
} from '../../constants/homeopathy-provider-approval.constants.js';

const textArraySchema = z.array(z.string().trim().min(1).max(160)).max(40).optional();
const careTeamServiceSchema = z.object({
  id: z.string().trim().min(1).optional(),
  providerRole: z.nativeEnum(CareTeamMemberType).optional().nullable(),
  providerRoleCode: z.string().trim().min(3).max(64).optional().nullable(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable().or(z.literal('')),
  pricingMode: z
    .nativeEnum(CareTeamServicePricingMode)
    .optional()
    .default(CareTeamServicePricingMode.FIXED),
  priceInPaise: z.number().int().min(0).max(500000).optional().default(0),
  firstSessionPriceInPaise: z.number().int().min(0).max(500000).optional().nullable(),
  offerEndsAt: z.coerce.date().optional().nullable(),
  offerBookingLimit: z.number().int().min(1).max(50000).optional().nullable(),
  pauseOfferWhenNoSlots: z.boolean().optional().default(false),
  followUpPriceInPaise: z.number().int().min(0).max(500000).optional().nullable(),
  followUpSessionLimit: z.number().int().min(1).max(1000).optional().nullable(),
  introSessionLimit: z.number().int().min(1).max(20).optional().default(1),
  packageSessionCount: z.number().int().min(1).max(100).optional().nullable(),
  packagePriceInPaise: z.number().int().min(0).max(5000000).optional().nullable(),
  freeMinutes: z.number().int().min(0).max(240).optional().default(0),
  pricePerMinuteInPaise: z.number().int().min(0).max(50000).optional().nullable(),
  currency: z.string().trim().max(8).optional().default('INR'),
  durationMinutes: z.number().int().min(5).max(240).optional().default(30),
  isFree: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(999).optional().default(0)
});
const mentalHealthProfileSchema = z
  .object({
    primaryRoleCode: z.string().trim().min(3).max(64).optional(),
    roleCodes: z.array(z.string().trim().min(3).max(64)).min(1).max(20).optional(),
    careTeamType: z.nativeEnum(CareTeamMemberType).optional(),
    careTeamTypes: z.array(z.nativeEnum(CareTeamMemberType)).max(12).optional(),
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
    autoMatchEnabled: z.boolean().optional(),
    acceptingNewUsers: z.boolean().optional(),
    maxSessionsPerDay: z.number().int().min(1).max(50).optional().nullable(),
    maxSessionsPerWeek: z.number().int().min(1).max(300).optional().nullable(),
    services: z.array(careTeamServiceSchema).max(20).optional()
  })
  .optional();

function compactTextArray(items?: string[]) {
  return (items ?? []).map((item) => item.trim()).filter(Boolean);
}

function requestedProviderRoles(
  body: z.infer<typeof mentalHealthProfileSchema>,
  fallbackPrimary: CareTeamMemberType,
  fallbackRoles: CareTeamMemberType[]
) {
  const primaryRoleCode = body?.primaryRoleCode || fallbackPrimary;
  const roleCodes = Array.from(
    new Set([primaryRoleCode, ...(body?.roleCodes?.length ? body.roleCodes : fallbackRoles)])
  );
  return { primaryRoleCode, roleCodes };
}

function toMentalHealthProfilePayload(body: z.infer<typeof mentalHealthProfileSchema>) {
  const careTeamType = body?.careTeamType ?? CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL;
  const careTeamTypes = normalizeProviderRoles(
    careTeamType,
    body?.careTeamTypes,
    'MENTAL_WELLNESS_PROFESSIONAL'
  ) as CareTeamMemberType[];
  const requestedRoles = requestedProviderRoles(body, careTeamType, careTeamTypes);
  const services = (body?.services ?? []).map((service, index) => ({
    ...(service.id ? { id: service.id } : {}),
    providerRole:
      service.providerRole && careTeamTypes.includes(service.providerRole)
        ? service.providerRole
        : careTeamType,
    providerRoleCode:
      service.providerRoleCode && requestedRoles.roleCodes.includes(service.providerRoleCode)
        ? service.providerRoleCode
        : requestedRoles.primaryRoleCode,
    title: service.title,
    description: service.description || null,
    pricingMode: service.pricingMode ?? CareTeamServicePricingMode.FIXED,
    priceInPaise:
      service.isFree && service.pricingMode !== CareTeamServicePricingMode.PER_MINUTE
        ? 0
        : (service.priceInPaise ?? 0),
    firstSessionPriceInPaise: service.firstSessionPriceInPaise ?? null,
    offerEndsAt: service.offerEndsAt ?? null,
    offerBookingLimit: service.offerBookingLimit ?? null,
    pauseOfferWhenNoSlots: service.pauseOfferWhenNoSlots ?? false,
    approvalStatus: 'APPROVED',
    approvalReason: null,
    approvalRequestedAt: null,
    approvedAt: new Date(),
    followUpPriceInPaise: service.followUpPriceInPaise ?? null,
    followUpSessionLimit: service.followUpSessionLimit ?? null,
    introSessionLimit: service.introSessionLimit ?? 1,
    packageSessionCount: service.packageSessionCount ?? null,
    packagePriceInPaise: service.packagePriceInPaise ?? null,
    freeMinutes: service.freeMinutes ?? 0,
    pricePerMinuteInPaise: service.pricePerMinuteInPaise ?? null,
    currency: service.currency || 'INR',
    durationMinutes: service.durationMinutes ?? 30,
    isFree:
      service.pricingMode === CareTeamServicePricingMode.FREE_VOLUNTEER
        ? true
        : service.pricingMode === CareTeamServicePricingMode.PER_MINUTE
          ? false
          : (service.isFree ?? (service.priceInPaise ?? 0) === 0),
    isActive: service.isActive ?? true,
    sortOrder: service.sortOrder ?? index
  }));
  return {
    careTeamType,
    careTeamTypes,
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
    autoMatchEnabled: body?.autoMatchEnabled ?? true,
    acceptingNewUsers: body?.acceptingNewUsers ?? true,
    maxSessionsPerDay: body?.maxSessionsPerDay ?? null,
    maxSessionsPerWeek: body?.maxSessionsPerWeek ?? null,
    services
  };
}

function mentalHealthProfileCreatePayload(
  payload: ReturnType<typeof toMentalHealthProfilePayload>
) {
  const { services, ...profile } = payload;
  const createServices = services.map(({ id: _id, ...service }) => service);
  return {
    ...profile,
    services: createServices.length ? { create: createServices } : undefined
  };
}

function mentalHealthProfileUpdatePayload(
  payload: ReturnType<typeof toMentalHealthProfilePayload>
) {
  const { services, ...profile } = payload;
  const existingServices = services.filter((service): service is typeof service & { id: string } =>
    Boolean(service.id)
  );
  const newServices = services.filter((service) => !service.id);
  return {
    ...profile,
    services: {
      deleteMany: { id: { notIn: existingServices.map((service) => service.id) } },
      ...(existingServices.length
        ? {
            upsert: existingServices.map(({ id, ...service }) => ({
              where: { id },
              update: service,
              create: { id, ...service }
            }))
          }
        : {}),
      ...(newServices.length ? { create: newServices } : {})
    }
  };
}

function doctorWorkspaceWhere(workspace: string): Prisma.UserWhereInput {
  if (workspace === 'hope-hub') {
    return {
      doctorProfile: {
        is: { providerDomain: ProviderDomain.HOPE_HUB }
      }
    };
  }
  if (workspace === 'homeopathy') {
    return {
      doctorProfile: {
        is: { providerDomain: ProviderDomain.HOMEOPATHY }
      }
    };
  }
  return {};
}

async function latestListenerScreeningForEmail(email?: string | null) {
  const normalizedEmail = email?.trim();
  if (!normalizedEmail) return null;

  const [attempt, application] = await Promise.all([
    prisma.listenerScreeningAttempt.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      select: {
        score: true,
        maxScore: true,
        passed: true,
        createdAt: true,
        questionSetVersion: true
      }
    }),
    prisma.counsellorApplication.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        listenerScreeningCompletedAt: { not: null }
      },
      orderBy: { listenerScreeningCompletedAt: 'desc' },
      select: {
        listenerScreeningScore: true,
        listenerScreeningMaxScore: true,
        listenerScreeningPassed: true,
        listenerScreeningCompletedAt: true,
        listenerScreeningQuestionSetVersion: true
      }
    })
  ]);

  const applicationCompletedAt = application?.listenerScreeningCompletedAt ?? null;
  const attemptCompletedAt = attempt?.createdAt ?? null;
  const useApplication =
    applicationCompletedAt &&
    (!attemptCompletedAt || applicationCompletedAt.getTime() >= attemptCompletedAt.getTime());

  if (useApplication && application) {
    return {
      score: application.listenerScreeningScore,
      maxScore: application.listenerScreeningMaxScore,
      passed: application.listenerScreeningPassed,
      completedAt: applicationCompletedAt,
      questionSetVersion: application.listenerScreeningQuestionSetVersion
    };
  }

  if (!attempt) return null;
  return {
    score: attempt.score,
    maxScore: attempt.maxScore,
    passed: attempt.passed,
    completedAt: attempt.createdAt,
    questionSetVersion: attempt.questionSetVersion
  };
}

async function withListenerScreeningForAdmin<
  T extends { email?: string | null; doctorProfile?: any }
>(provider: T) {
  if (!provider.doctorProfile) return provider;
  const providerClassification =
    providerClassificationFromAssignments(provider.doctorProfile) ??
    providerClassificationFromLegacy(provider.doctorProfile);
  const listenerScreening = provider.doctorProfile.mentalHealthProfile
    ? await latestListenerScreeningForEmail(provider.email)
    : null;
  return {
    ...provider,
    doctorProfile: {
      ...provider.doctorProfile,
      providerClassification,
      ...(provider.doctorProfile.mentalHealthProfile
        ? {
            mentalHealthProfile: {
              ...provider.doctorProfile.mentalHealthProfile,
              listenerScreening
            }
          }
        : {})
    }
  };
}

export function registerAdminDoctorRoutes(router: Router) {
  // ─── Doctors ──────────────────────────────────────────────────────────────────

  router.get(
    '/admin/doctors',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 10);
      const query = queryText(req, 'q').trim();
      const status = queryText(req, 'status').toUpperCase();
      const sortBy = queryText(req, 'sortBy');
      const supportPath = queryText(req, 'supportPath').toUpperCase();
      const supportPathTypes = hopeHubCareTeamTypesForSupportPath(supportPath);
      const workspace = getAuthorizedAdminWorkspace(req, res);
      if (workspace === null) return;
      const sortDirection =
        queryText(req, 'sortDirection').toLowerCase() === 'asc' ? 'asc' : 'desc';
      const andFilters: Prisma.UserWhereInput[] = [];
      const workspaceWhere = doctorWorkspaceWhere(workspace);
      if (Object.keys(workspaceWhere).length) {
        andFilters.push(workspaceWhere);
      }
      if (status === 'SUSPENDED') {
        andFilters.push({ doctorProfile: { is: { suspendedAt: { not: null } } } });
      }
      if (supportPathTypes.length) {
        andFilters.push({
          doctorProfile: {
            is: {
              OR: [
                {
                  roleAssignments: {
                    some: {
                      status: 'ACTIVE',
                      role: { category: supportPath, isActive: true }
                    }
                  }
                },
                {
                  mentalHealthProfile: {
                    is: {
                      OR: [
                        { careTeamType: { in: supportPathTypes } },
                        { careTeamTypes: { hasSome: supportPathTypes } }
                      ]
                    }
                  }
                }
              ]
            }
          }
        });
      }

      const where: Prisma.UserWhereInput = {
        role: Role.DOCTOR,
        ...(status === 'ACTIVE' ? { isActive: true } : {}),
        ...(status === 'INACTIVE' ? { isActive: false } : {}),
        ...(andFilters.length ? { AND: andFilters } : {}),
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
          gender: true,
          isActive: true,
          createdAt: true,
          doctorProfile: { select: doctorProfileSelect }
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      const doctorsWithReadiness = await Promise.all(doctors.map(withListenerScreeningForAdmin));

      res.json({
        doctors: doctorsWithReadiness,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.get(
    '/admin/doctors/pending',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 10);
      const query = queryText(req, 'q').trim();
      const supportPath = queryText(req, 'supportPath').toUpperCase();
      const supportPathTypes = hopeHubCareTeamTypesForSupportPath(supportPath);
      const workspace = getAuthorizedAdminWorkspace(req, res);
      if (workspace === null) return;

      const approvalQueueWhere: Prisma.UserWhereInput =
        workspace === 'homeopathy'
          ? {
              OR: [
                { isActive: false },
                {
                  doctorProfile: {
                    is: {
                      suspendedAt: { not: null },
                      suspendedReason: {
                        startsWith: HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX,
                        mode: 'insensitive'
                      }
                    }
                  }
                }
              ]
            }
          : { isActive: false };

      const andFilters: Prisma.UserWhereInput[] = [approvalQueueWhere];
      if (supportPathTypes.length) {
        andFilters.push({
          doctorProfile: {
            is: {
              OR: [
                {
                  roleAssignments: {
                    some: {
                      status: 'ACTIVE',
                      role: { category: supportPath, isActive: true }
                    }
                  }
                },
                {
                  mentalHealthProfile: {
                    is: {
                      OR: [
                        { careTeamType: { in: supportPathTypes } },
                        { careTeamTypes: { hasSome: supportPathTypes } }
                      ]
                    }
                  }
                }
              ]
            }
          }
        });
      }
      if (query) {
        andFilters.push({
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { email: { contains: query, mode: 'insensitive' as const } },
            { mobile: { contains: query, mode: 'insensitive' as const } },
            { doctorProfile: { specialty: { contains: query, mode: 'insensitive' as const } } }
          ]
        });
      }

      const where: Prisma.UserWhereInput = {
        role: Role.DOCTOR,
        ...doctorWorkspaceWhere(workspace),
        AND: andFilters
      };

      const total = await prisma.user.count({ where });
      const pendingDoctors = await prisma.user.findMany({
        where,
        select: {
          ...publicUserSelect,
          gender: true,
          isActive: true,
          createdAt: true,
          doctorProfile: { select: doctorProfileSelect }
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      const pendingDoctorsWithReadiness = await Promise.all(
        pendingDoctors.map(withListenerScreeningForAdmin)
      );

      res.json({
        pendingDoctors: pendingDoctorsWithReadiness,
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.post(
    '/admin/doctors/:id/approve',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const existing = await prisma.user.findUnique({
        where: { id: doctorId },
        select: {
          role: true,
          doctorProfile: {
            select: { providerDomain: true, suspendedAt: true, suspendedReason: true }
          }
        }
      });
      if (!existing || existing.role !== Role.DOCTOR || !existing.doctorProfile) {
        return res.status(404).json({ message: 'Provider application not found.' });
      }

      const workspace =
        existing.doctorProfile.providerDomain === ProviderDomain.HOPE_HUB
          ? 'hope-hub'
          : 'homeopathy';
      if (!staffCanAccessWorkspace(req.user, workspace)) {
        return res.status(403).json({
          message: 'You do not have access to approve providers in this workspace.',
          workspace
        });
      }

      const credentialReview =
        workspace === 'homeopathy' &&
        Boolean(existing.doctorProfile.suspendedAt) &&
        isHomeopathyCredentialReview(existing.doctorProfile.suspendedReason);

      if (credentialReview) {
        try {
          const result = await approveHomeopathyProviderAccount({
            doctorId,
            actorId: req.user!.id,
            actorRole: req.user!.role
          });
          return res.json({
            doctor: result.doctor,
            message: result.alreadyApproved
              ? 'This provider was already approved.'
              : 'Homeopathy credentials approved. The provider is now active and public.'
          });
        } catch (error) {
          if (error instanceof HomeopathyProviderApprovalError) {
            return res.status(error.code === 'PROVIDER_NOT_FOUND' ? 404 : 409).json({
              message: error.message,
              code: error.code,
              blockers: error.blockers
            });
          }
          throw error;
        }
      }

      const doctor = await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: doctorId }, data: { isActive: true } });
        return tx.user.findUniqueOrThrow({
          where: { id: doctorId },
          select: { ...publicUserSelect, isActive: true, doctorProfile: true }
        });
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.approve',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Provider account activated by admin.',
        metadata: { workspace, credentialReview }
      });
      res.json({
        doctor,
        message: 'Provider account activated successfully.'
      });
    })
  );

  router.post(
    '/admin/doctors/:id/reject',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const body = z
        .object({ reason: z.string().trim().max(1000).optional().nullable() })
        .parse(req.body ?? {});
      const existing = await prisma.user.findUnique({
        where: { id: doctorId },
        select: {
          role: true,
          doctorProfile: {
            select: { providerDomain: true, suspendedAt: true, suspendedReason: true }
          }
        }
      });
      if (!existing || existing.role !== Role.DOCTOR || !existing.doctorProfile) {
        return res.status(404).json({ message: 'Provider application not found.' });
      }
      const workspace =
        existing.doctorProfile.providerDomain === ProviderDomain.HOPE_HUB
          ? 'hope-hub'
          : 'homeopathy';
      if (!staffCanAccessWorkspace(req.user, workspace)) {
        return res.status(403).json({
          message: 'You do not have access to review providers in this workspace.',
          workspace
        });
      }
      const credentialReview =
        workspace === 'homeopathy' &&
        Boolean(existing.doctorProfile.suspendedAt) &&
        isHomeopathyCredentialReview(existing.doctorProfile.suspendedReason);
      const reason = body.reason?.trim() || '';
      const doctor = await prisma.$transaction(async (tx) => {
        if (credentialReview) {
          await tx.user.update({ where: { id: doctorId }, data: { isActive: true } });
          await tx.doctor.update({
            where: { userId: doctorId },
            data: {
              suspendedAt: new Date(),
              suspendedReason: reason
                ? `${HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX}: ${reason}`
                : `${HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX}. Please contact Hope Hub support.`,
              suspendedById: req.user!.id,
              showOnWebsite: false,
              isAvailable: false,
              isOnline: false
            }
          });
        } else {
          await tx.user.update({ where: { id: doctorId }, data: { isActive: false } });
        }
        return tx.user.findUniqueOrThrow({
          where: { id: doctorId },
          select: { ...publicUserSelect, isActive: true, doctorProfile: true }
        });
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.deactivate',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: credentialReview
          ? 'Homeopathy credential application returned for changes.'
          : 'Provider account deactivated by admin.',
        metadata: { workspace, credentialReview, reason: reason || null }
      });
      res.json({
        doctor,
        message: credentialReview
          ? 'Credential application returned for changes.'
          : 'Provider account deactivated.'
      });
    })
  );

  router.put(
    '/admin/doctors/:id/status',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
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
        summary: body.isActive ? 'Provider activated by admin.' : 'Provider deactivated by admin.',
        metadata: { isActive: body.isActive }
      });
      res.json({
        doctor,
        message: body.isActive
          ? 'Provider activated successfully.'
          : 'Provider deactivated successfully.'
      });
    })
  );

  router.put(
    '/admin/doctors/:id/suspension',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const body = z
        .object({
          suspended: z.boolean(),
          reason: z.string().trim().max(2000).optional().nullable()
        })
        .parse(req.body);

      const reason = body.reason?.trim() || null;
      const updatedProfile = await prisma.doctor.update({
        where: { userId: doctorId },
        data: body.suspended
          ? {
              suspendedAt: new Date(),
              suspendedReason: reason || 'Suspended by admin.',
              suspendedById: req.user!.id,
              showOnWebsite: false,
              isAvailable: false,
              isOnline: false
            }
          : {
              suspendedAt: null,
              suspendedReason: null,
              suspendedById: null
            },
        select: { id: true }
      });

      const doctor = await prisma.user.findUniqueOrThrow({
        where: { id: doctorId },
        select: {
          ...publicUserSelect,
          gender: true,
          isActive: true,
          createdAt: true,
          doctorProfile: { select: { ...doctorProfileSelect, id: true } }
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: body.suspended ? 'doctor.suspend' : 'doctor.unsuspend',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: body.suspended
          ? 'Provider suspended by admin.'
          : 'Provider suspension removed by admin.',
        metadata: { doctorProfileId: updatedProfile.id, reason }
      });

      res.json({
        doctor: await withListenerScreeningForAdmin(doctor),
        message: body.suspended
          ? 'Provider suspended and hidden from public/live access.'
          : 'Provider suspension removed.'
      });
    })
  );

  router.get(
    '/admin/doctors/:id/readiness',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const doctor = await prisma.user.findFirst({
        where: { id: doctorId, role: Role.DOCTOR },
        select: { id: true }
      });
      if (!doctor) {
        return res.status(404).json({ message: 'Provider not found.' });
      }
      const readiness = await providerPublicReadiness(doctor.id);
      res.json({ readiness });
    })
  );

  router.post(
    '/admin/doctors',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().min(8).optional(),
          gender: z.nativeEnum(PatientGender).optional().nullable(),
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
          gender: body.gender ?? null,
          passwordHash,
          role: Role.DOCTOR,
          doctorProfile: {
            create: {
              ...profilePayload,
              providerDomain:
                profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
                  ? ProviderDomain.HOPE_HUB
                  : ProviderDomain.HOMEOPATHY,
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
        select: {
          ...publicUserSelect,
          gender: true,
          doctorProfile: { select: { ...doctorProfileSelect, id: true } }
        }
      });
      if (
        doctor.doctorProfile &&
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
      ) {
        const requestedRoles = requestedProviderRoles(
          body.mentalHealthProfile,
          mentalProfilePayload.careTeamType,
          mentalProfilePayload.careTeamTypes
        );
        await syncProviderRoleAssignments({
          doctorId: doctor.doctorProfile.id,
          ...requestedRoles,
          actorId: req.user!.id
        });
      }
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.create',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Provider account created by admin.',
        metadata: { specialty: profilePayload.specialty, doctorType: profilePayload.doctorType }
      });
      res.status(201).json({ doctor });
    })
  );

  router.put(
    '/admin/doctors/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const existing = await prisma.user.findFirst({
        where: { id: doctorId, role: Role.DOCTOR },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          gender: true,
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
              mentalHealthProfile: { include: { services: true } }
            }
          }
        }
      });
      if (!existing) return res.status(404).json({ message: 'Provider not found' });

      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().min(8).optional().or(z.literal('')),
          gender: z.nativeEnum(PatientGender).optional().nullable(),
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
      const existingServiceIds = new Set(
        existing.doctorProfile?.mentalHealthProfile?.services.map((service) => service.id) ?? []
      );
      const unknownServiceId = body.mentalHealthProfile?.services?.find(
        (service) => service.id && !existingServiceIds.has(service.id)
      )?.id;
      if (unknownServiceId) {
        return res.status(400).json({ message: 'One of the selected services is not available.' });
      }
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
          gender: body.gender ?? null,
          mobile: body.mobile || null,
          doctorProfile: {
            upsert: {
              create: {
                ...profilePayload,
                providerDomain:
                  profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
                    ? ProviderDomain.HOPE_HUB
                    : ProviderDomain.HOMEOPATHY,
                designation: hrFields.designation,
                department: hrFields.department,
                isAvailable: profilePayload.isAvailable,
                ...compensationFields,
                ...publicProfileFields,
                ...mentalHealthProfileCreate
              },
              update: {
                ...profilePayload,
                providerDomain:
                  profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
                    ? ProviderDomain.HOPE_HUB
                    : ProviderDomain.HOMEOPATHY,
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
          gender: true,
          isActive: true,
          doctorProfile: { select: { ...doctorProfileSelect, id: true } }
        }
      });
      if (
        doctor.doctorProfile &&
        profilePayload.doctorType === HomeopathicDoctorType.PSYCHOLOGIST
      ) {
        const requestedRoles = requestedProviderRoles(
          body.mentalHealthProfile,
          mentalProfilePayload.careTeamType,
          mentalProfilePayload.careTeamTypes
        );
        await syncProviderRoleAssignments({
          doctorId: doctor.doctorProfile.id,
          ...requestedRoles,
          actorId: req.user!.id
        });
      }
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.update',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Provider profile updated by admin.',
        metadata: {
          before: {
            name: existing.name,
            email: existing.email,
            mobile: existing.mobile,
            gender: existing.gender,
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
            gender: body.gender ?? null,
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
      if (body.mentalHealthProfile?.services && doctor.doctorProfile) {
        await writeAuditLog({
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'provider.pricing_update',
          targetType: 'doctor-pricing',
          targetId: doctor.doctorProfile.id,
          summary: 'Provider pricing and service configuration updated by admin.',
          metadata: {
            before: existing.doctorProfile?.mentalHealthProfile?.services ?? [],
            after: doctor.doctorProfile.mentalHealthProfile?.services ?? []
          }
        });
      }
      res.json({ doctor, message: 'Provider profile updated successfully.' });
    })
  );

  router.patch(
    '/admin/doctors/services/:serviceId/pricing-approval',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const serviceId = routeParam(req, 'serviceId');
      const body = z
        .object({
          decision: z.enum(['APPROVED', 'REJECTED']),
          reason: z.string().trim().max(1000).optional().nullable()
        })
        .parse(req.body);
      const existingService = await prisma.careTeamService.findUniqueOrThrow({
        where: { id: serviceId },
        include: {
          mentalHealthProfile: { select: { doctor: { select: { id: true, userId: true } } } }
        }
      });
      const service = await prisma.careTeamService.update({
        where: { id: serviceId },
        data: {
          approvalStatus: body.decision,
          approvalReason: body.reason || null,
          approvedAt: body.decision === 'APPROVED' ? new Date() : null,
          approvedById: body.decision === 'APPROVED' ? req.user!.id : null
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action:
          body.decision === 'APPROVED' ? 'provider.pricing_approved' : 'provider.pricing_rejected',
        targetType: 'care-team-service',
        targetId: serviceId,
        summary: `Provider service pricing ${body.decision.toLowerCase()} by admin.`,
        metadata: { before: existingService, after: service, reason: body.reason || null }
      });
      const provider = existingService.mentalHealthProfile.doctor;
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action:
          body.decision === 'APPROVED' ? 'provider.pricing_approved' : 'provider.pricing_rejected',
        targetType: 'doctor-pricing',
        targetId: provider.id,
        summary:
          body.decision === 'APPROVED'
            ? `${service.title} pricing approved.`
            : `${service.title} pricing changes requested.`,
        metadata: {
          serviceId,
          serviceTitle: service.title,
          decision: body.decision,
          reason: body.reason || null
        }
      });
      const readiness = await providerPublicReadiness(provider.userId);
      await prisma.doctor.update({
        where: { id: provider.id },
        data: { showOnWebsite: readiness.ready }
      });
      res.json({ service, readiness });
    })
  );

  router.get(
    '/admin/doctors/pricing-approvals',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const services = await prisma.careTeamService.findMany({
        where: { approvalStatus: 'PENDING' },
        orderBy: [{ approvalRequestedAt: 'asc' }, { updatedAt: 'asc' }],
        take: 100,
        select: {
          id: true,
          title: true,
          pricingMode: true,
          priceInPaise: true,
          firstSessionPriceInPaise: true,
          followUpPriceInPaise: true,
          packagePriceInPaise: true,
          packageSessionCount: true,
          durationMinutes: true,
          approvalReason: true,
          approvalRequestedAt: true,
          mentalHealthProfile: {
            select: {
              doctor: {
                select: { id: true, user: { select: { id: true, name: true, email: true } } }
              }
            }
          }
        }
      });
      res.json({
        reviews: services.map(({ mentalHealthProfile, ...service }) => ({
          ...service,
          providerId: mentalHealthProfile.doctor.id,
          provider: mentalHealthProfile.doctor.user
        }))
      });
    })
  );

  /** Set the website display order for a doctor. */
  router.patch(
    '/admin/doctors/:id/website-order',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
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
            ? `Provider website order set to ${websiteOrder}.`
            : 'Provider website order cleared.'
      });

      res.json({ message: 'Website order updated.' });
    })
  );
}
