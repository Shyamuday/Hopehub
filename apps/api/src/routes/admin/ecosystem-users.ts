import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryText, routeParam, writeAuditLog } from '../../utils/helpers.js';

export const ECOSYSTEM_ROLES = [
  Role.BRANCH_OWNER,
  Role.PATIENT_COORDINATOR,
  Role.CALL_CENTER,
  Role.MARKETING,
  Role.CORPORATE_WELLNESS,
  Role.INSURANCE_PARTNER
] as const;

export type EcosystemRole = (typeof ECOSYSTEM_ROLES)[number];

const ecosystemRoleSchema = z.enum([
  Role.BRANCH_OWNER,
  Role.PATIENT_COORDINATOR,
  Role.CALL_CENTER,
  Role.MARKETING,
  Role.CORPORATE_WELLNESS,
  Role.INSURANCE_PARTNER
]);

const createUserSchema = z.object({
  role: ecosystemRoleSchema,
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  employeeId: z.string().optional(),
  designation: z.string().optional(),
  storeId: z.string().optional(),
  corporateId: z.string().optional(),
  companyName: z.string().optional(),
  companyCode: z.string().optional()
});

const updateProfileSchema = z.object({
  employeeId: z.string().optional(),
  designation: z.string().optional(),
  storeId: z.string().optional(),
  corporateId: z.string().optional(),
  companyName: z.string().optional(),
  companyCode: z.string().optional()
});

function profileInclude(role: EcosystemRole) {
  switch (role) {
    case Role.BRANCH_OWNER:
      return {
        branchOwnerProfile: { include: { store: { select: { id: true, name: true, code: true } } } }
      };
    case Role.PATIENT_COORDINATOR:
      return {
        patientCoordinatorProfile: {
          include: { store: { select: { id: true, name: true, code: true } } }
        }
      };
    case Role.CALL_CENTER:
      return { callCenterProfile: true };
    case Role.MARKETING:
      return { marketingProfile: true };
    case Role.CORPORATE_WELLNESS:
      return { corporateWellnessProfile: { include: { corporate: true } } };
    case Role.INSURANCE_PARTNER:
      return { insurancePartnerProfile: true };
    default:
      return {};
  }
}

function serializeUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    branchOwnerProfile: user.branchOwnerProfile ?? null,
    patientCoordinatorProfile: user.patientCoordinatorProfile ?? null,
    callCenterProfile: user.callCenterProfile ?? null,
    marketingProfile: user.marketingProfile ?? null,
    corporateWellnessProfile: user.corporateWellnessProfile ?? null,
    insurancePartnerProfile: user.insurancePartnerProfile ?? null
  };
}

export function registerAdminEcosystemUserRoutes(router: Router) {
  router.get(
    '/admin/ecosystem-users/meta',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const [stores, corporates] = await Promise.all([
        prisma.store.findMany({
          where: { isActive: true },
          select: { id: true, name: true, code: true, address: true },
          orderBy: { name: 'asc' }
        }),
        prisma.corporateAccount.findMany({
          where: { isActive: true },
          select: { id: true, code: true, name: true, contactEmail: true },
          orderBy: { name: 'asc' }
        })
      ]);
      res.json({
        roles: ECOSYSTEM_ROLES,
        stores,
        corporates
      });
    })
  );

  router.get(
    '/admin/ecosystem-users/corporates',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const accounts = await prisma.corporateAccount.findMany({
        include: { _count: { select: { enrollments: true, profiles: true } } },
        orderBy: { name: 'asc' }
      });
      res.json({
        accounts: accounts.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          contactEmail: a.contactEmail,
          isActive: a.isActive,
          enrollmentCount: a._count.enrollments,
          portalUserCount: a._count.profiles
        }))
      });
    })
  );

  router.post(
    '/admin/ecosystem-users/corporates',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          code: z.string().min(2).max(20),
          name: z.string().min(1),
          contactEmail: z.string().email().optional()
        })
        .parse(req.body);

      const existing = await prisma.corporateAccount.findUnique({
        where: { code: body.code.toUpperCase() }
      });
      if (existing) {
        return res.status(409).json({ message: 'Corporate code already exists.' });
      }

      const account = await prisma.corporateAccount.create({
        data: {
          code: body.code.toUpperCase(),
          name: body.name.trim(),
          contactEmail: body.contactEmail?.trim() || null
        }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'ecosystem.corporate.create',
        targetType: 'corporate_account',
        targetId: account.id,
        summary: `Created corporate account ${account.name}.`,
        metadata: { code: account.code }
      });

      res.status(201).json({ account });
    })
  );

  router.get(
    '/admin/ecosystem-users',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const roleParam = queryText(req, 'role');
      const roles =
        roleParam && ECOSYSTEM_ROLES.includes(roleParam as EcosystemRole)
          ? [roleParam as EcosystemRole]
          : [...ECOSYSTEM_ROLES];

      const users = await prisma.user.findMany({
        where: { role: { in: roles } },
        include: {
          branchOwnerProfile: {
            include: { store: { select: { id: true, name: true, code: true } } }
          },
          patientCoordinatorProfile: {
            include: { store: { select: { id: true, name: true, code: true } } }
          },
          callCenterProfile: true,
          marketingProfile: true,
          corporateWellnessProfile: { include: { corporate: true } },
          insurancePartnerProfile: true
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'desc' }]
      });

      res.json({ users: users.map(serializeUser) });
    })
  );

  router.post(
    '/admin/ecosystem-users',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = createUserSchema.parse(req.body);

      if (
        (body.role === Role.BRANCH_OWNER || body.role === Role.PATIENT_COORDINATOR) &&
        !body.storeId
      ) {
        return res.status(400).json({ message: 'storeId is required for this role.' });
      }
      if (body.role === Role.CORPORATE_WELLNESS && !body.corporateId) {
        return res
          .status(400)
          .json({ message: 'corporateId is required for corporate wellness users.' });
      }
      if (body.role === Role.INSURANCE_PARTNER && (!body.companyName || !body.companyCode)) {
        return res
          .status(400)
          .json({ message: 'companyName and companyCode are required for insurance partners.' });
      }

      const email = body.email.trim().toLowerCase();
      const existing = await prisma.user.findFirst({ where: { email, role: body.role } });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use for this role.' });
      }

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(body.password, 12);

      const baseData = {
        name: body.name.trim(),
        email,
        passwordHash,
        role: body.role,
        isActive: true
      };

      let user;
      switch (body.role) {
        case Role.BRANCH_OWNER:
          await prisma.store.findUniqueOrThrow({ where: { id: body.storeId! } });
          user = await prisma.user.create({
            data: {
              ...baseData,
              branchOwnerProfile: {
                create: {
                  storeId: body.storeId!,
                  employeeId: body.employeeId,
                  designation: body.designation ?? 'Branch Owner'
                }
              }
            },
            include: profileInclude(Role.BRANCH_OWNER)
          });
          break;
        case Role.PATIENT_COORDINATOR:
          await prisma.store.findUniqueOrThrow({ where: { id: body.storeId! } });
          user = await prisma.user.create({
            data: {
              ...baseData,
              patientCoordinatorProfile: {
                create: {
                  storeId: body.storeId!,
                  employeeId: body.employeeId,
                  designation: body.designation ?? 'Patient Coordinator'
                }
              }
            },
            include: profileInclude(Role.PATIENT_COORDINATOR)
          });
          break;
        case Role.CALL_CENTER:
          user = await prisma.user.create({
            data: {
              ...baseData,
              callCenterProfile: {
                create: {
                  employeeId: body.employeeId,
                  designation: body.designation ?? 'Call Center Agent'
                }
              }
            },
            include: profileInclude(Role.CALL_CENTER)
          });
          break;
        case Role.MARKETING:
          user = await prisma.user.create({
            data: {
              ...baseData,
              marketingProfile: {
                create: {
                  employeeId: body.employeeId,
                  designation: body.designation ?? 'Marketing Manager'
                }
              }
            },
            include: profileInclude(Role.MARKETING)
          });
          break;
        case Role.CORPORATE_WELLNESS:
          await prisma.corporateAccount.findUniqueOrThrow({ where: { id: body.corporateId! } });
          user = await prisma.user.create({
            data: {
              ...baseData,
              corporateWellnessProfile: { create: { corporateId: body.corporateId! } }
            },
            include: profileInclude(Role.CORPORATE_WELLNESS)
          });
          break;
        case Role.INSURANCE_PARTNER: {
          const code = body.companyCode!.trim().toUpperCase();
          const dup = await prisma.insurancePartnerProfile.findUnique({
            where: { companyCode: code }
          });
          if (dup) {
            return res.status(409).json({ message: 'Insurance company code already exists.' });
          }
          user = await prisma.user.create({
            data: {
              ...baseData,
              insurancePartnerProfile: {
                create: {
                  companyName: body.companyName!.trim(),
                  companyCode: code
                }
              }
            },
            include: profileInclude(Role.INSURANCE_PARTNER)
          });
          break;
        }
        default:
          return res.status(400).json({ message: 'Unsupported role.' });
      }

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'ecosystem.user.create',
        targetType: 'user',
        targetId: user.id,
        summary: `Created ${body.role} user ${user.name}.`,
        metadata: { email: user.email, role: body.role }
      });

      res.status(201).json({ user: serializeUser(user) });
    })
  );

  router.patch(
    '/admin/ecosystem-users/:id/status',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing || !ECOSYSTEM_ROLES.includes(existing.role as EcosystemRole)) {
        return res.status(404).json({ message: 'Ecosystem user not found.' });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { isActive },
        include: {
          branchOwnerProfile: {
            include: { store: { select: { id: true, name: true, code: true } } }
          },
          patientCoordinatorProfile: {
            include: { store: { select: { id: true, name: true, code: true } } }
          },
          callCenterProfile: true,
          marketingProfile: true,
          corporateWellnessProfile: { include: { corporate: true } },
          insurancePartnerProfile: true
        }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: isActive ? 'ecosystem.user.activate' : 'ecosystem.user.deactivate',
        targetType: 'user',
        targetId: user.id,
        summary: `${isActive ? 'Activated' : 'Deactivated'} ${user.role} ${user.name}.`,
        metadata: { email: user.email }
      });

      res.json({ user: serializeUser(user) });
    })
  );

  router.patch(
    '/admin/ecosystem-users/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = updateProfileSchema.parse(req.body);

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing || !ECOSYSTEM_ROLES.includes(existing.role as EcosystemRole)) {
        return res.status(404).json({ message: 'Ecosystem user not found.' });
      }

      switch (existing.role) {
        case Role.BRANCH_OWNER:
          if (body.storeId) await prisma.store.findUniqueOrThrow({ where: { id: body.storeId } });
          await prisma.branchOwnerProfile.update({
            where: { userId: id },
            data: {
              storeId: body.storeId,
              employeeId: body.employeeId,
              designation: body.designation
            }
          });
          break;
        case Role.PATIENT_COORDINATOR:
          if (body.storeId) await prisma.store.findUniqueOrThrow({ where: { id: body.storeId } });
          await prisma.patientCoordinatorProfile.update({
            where: { userId: id },
            data: {
              storeId: body.storeId,
              employeeId: body.employeeId,
              designation: body.designation
            }
          });
          break;
        case Role.CALL_CENTER:
          await prisma.callCenterProfile.update({
            where: { userId: id },
            data: { employeeId: body.employeeId, designation: body.designation }
          });
          break;
        case Role.MARKETING:
          await prisma.marketingProfile.update({
            where: { userId: id },
            data: { employeeId: body.employeeId, designation: body.designation }
          });
          break;
        case Role.CORPORATE_WELLNESS:
          if (body.corporateId) {
            await prisma.corporateAccount.findUniqueOrThrow({ where: { id: body.corporateId } });
            await prisma.corporateWellnessProfile.update({
              where: { userId: id },
              data: { corporateId: body.corporateId }
            });
          }
          break;
        case Role.INSURANCE_PARTNER:
          if (body.companyCode) {
            const code = body.companyCode.trim().toUpperCase();
            const dup = await prisma.insurancePartnerProfile.findFirst({
              where: { companyCode: code, userId: { not: id } }
            });
            if (dup)
              return res.status(409).json({ message: 'Insurance company code already exists.' });
          }
          await prisma.insurancePartnerProfile.update({
            where: { userId: id },
            data: {
              companyName: body.companyName?.trim(),
              companyCode: body.companyCode?.trim().toUpperCase()
            }
          });
          break;
      }

      const user = await prisma.user.findUniqueOrThrow({
        where: { id },
        include: {
          branchOwnerProfile: {
            include: { store: { select: { id: true, name: true, code: true } } }
          },
          patientCoordinatorProfile: {
            include: { store: { select: { id: true, name: true, code: true } } }
          },
          callCenterProfile: true,
          marketingProfile: true,
          corporateWellnessProfile: { include: { corporate: true } },
          insurancePartnerProfile: true
        }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'ecosystem.user.update',
        targetType: 'user',
        targetId: user.id,
        summary: `Updated ${user.role} profile for ${user.name}.`,
        metadata: { email: user.email }
      });

      res.json({ user: serializeUser(user) });
    })
  );

  router.get(
    '/admin/ecosystem-users/corporates/:id/enrollments',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const corporateId = routeParam(req, 'id');
      await prisma.corporateAccount.findUniqueOrThrow({ where: { id: corporateId } });
      const enrollments = await prisma.corporateEnrollment.findMany({
        where: { corporateId },
        include: {
          patient: {
            select: { id: true, name: true, email: true, patientCode: true, mobile: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ enrollments });
    })
  );

  router.post(
    '/admin/ecosystem-users/corporates/:id/enrollments',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const corporateId = routeParam(req, 'id');
      const { patientId } = z.object({ patientId: z.string().min(1) }).parse(req.body);
      await prisma.corporateAccount.findUniqueOrThrow({ where: { id: corporateId } });
      const patient = await prisma.user.findFirst({ where: { id: patientId, role: Role.PATIENT } });
      if (!patient) return res.status(404).json({ message: 'Patient not found.' });

      const enrollment = await prisma.corporateEnrollment.upsert({
        where: { corporateId_patientId: { corporateId, patientId } },
        update: {},
        create: { corporateId, patientId },
        include: {
          patient: {
            select: { id: true, name: true, email: true, patientCode: true, mobile: true }
          }
        }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'ecosystem.enrollment.create',
        targetType: 'corporate_enrollment',
        targetId: enrollment.id,
        summary: `Enrolled ${patient.name} in corporate program.`,
        metadata: { corporateId, patientId }
      });

      res.status(201).json({ enrollment });
    })
  );

  router.delete(
    '/admin/ecosystem-users/corporates/:corporateId/enrollments/:patientId',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const corporateId = routeParam(req, 'corporateId');
      const patientId = routeParam(req, 'patientId');
      await prisma.corporateEnrollment.deleteMany({ where: { corporateId, patientId } });
      res.json({ ok: true });
    })
  );

  router.get(
    '/admin/ecosystem-users/insurance/claims',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const claims = await prisma.insuranceClaim.findMany({
        include: {
          patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
          partner: {
            select: {
              id: true,
              companyName: true,
              companyCode: true,
              user: { select: { email: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      });
      res.json({ claims });
    })
  );
}
