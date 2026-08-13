import { Router } from 'express';
import { z } from 'zod';
import { Role, StoreKind } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryText, routeParam, writeAuditLog } from '../../utils/helpers.js';

export const STAFF_PORTAL_ROLES = [
  Role.RECEPTIONIST,
  Role.CLINIC_MANAGER,
  Role.ACCOUNTANT
] as const;
export const PARTNER_PORTAL_ROLES = [
  Role.SUPPLIER,
  Role.WAREHOUSE_MANAGER,
  Role.DELIVERY_EXECUTIVE,
  Role.DIAGNOSTIC_PARTNER
] as const;
export const PORTAL_USER_ROLES = [...STAFF_PORTAL_ROLES, ...PARTNER_PORTAL_ROLES] as const;

type PortalUserRole = (typeof PORTAL_USER_ROLES)[number];

const portalRoleSchema = z.enum([
  Role.RECEPTIONIST,
  Role.CLINIC_MANAGER,
  Role.ACCOUNTANT,
  Role.SUPPLIER,
  Role.WAREHOUSE_MANAGER,
  Role.DELIVERY_EXECUTIVE,
  Role.DIAGNOSTIC_PARTNER
]);

const createSchema = z.object({
  role: portalRoleSchema,
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  employeeId: z.string().optional(),
  designation: z.string().optional(),
  storeId: z.string().optional(),
  supplierId: z.string().optional(),
  warehouseId: z.string().optional(),
  diagnosticCenterId: z.string().optional()
});

const updateSchema = z.object({
  employeeId: z.string().optional(),
  designation: z.string().optional(),
  storeId: z.string().optional(),
  supplierId: z.string().optional(),
  warehouseId: z.string().optional(),
  diagnosticCenterId: z.string().optional()
});

const userInclude = {
  receptionistProfile: { include: { store: { select: { id: true, name: true, code: true } } } },
  clinicManagerProfile: { include: { store: { select: { id: true, name: true, code: true } } } },
  accountantProfile: true,
  supplierProfile: { include: { supplier: { select: { id: true, name: true, code: true } } } },
  warehouseManagerProfile: {
    include: { warehouse: { select: { id: true, name: true, code: true } } }
  },
  deliveryExecutiveProfile: {
    include: { store: { select: { id: true, name: true, code: true } } }
  },
  diagnosticCenterProfile: {
    include: { diagnosticCenter: { select: { id: true, name: true, code: true } } }
  }
};

function serializeUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    receptionistProfile: user.receptionistProfile ?? null,
    clinicManagerProfile: user.clinicManagerProfile ?? null,
    accountantProfile: user.accountantProfile ?? null,
    supplierProfile: user.supplierProfile ?? null,
    warehouseManagerProfile: user.warehouseManagerProfile ?? null,
    deliveryExecutiveProfile: user.deliveryExecutiveProfile ?? null,
    diagnosticCenterProfile: user.diagnosticCenterProfile ?? null
  };
}

function isPortalRole(role: Role): role is PortalUserRole {
  return (PORTAL_USER_ROLES as readonly Role[]).includes(role);
}

export function registerAdminPortalUserRoutes(router: Router) {
  router.get(
    '/admin/portal-users/meta',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const [stores, warehouses, suppliers, diagnosticCenters] = await Promise.all([
        prisma.store.findMany({
          where: { isActive: true, kind: StoreKind.BRANCH },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' }
        }),
        prisma.store.findMany({
          where: { isActive: true, kind: StoreKind.WAREHOUSE },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' }
        }),
        prisma.supplier.findMany({
          where: { isActive: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' }
        }),
        prisma.diagnosticCenter.findMany({
          where: { isActive: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' }
        })
      ]);
      res.json({
        roles: PORTAL_USER_ROLES,
        staffRoles: STAFF_PORTAL_ROLES,
        partnerRoles: PARTNER_PORTAL_ROLES,
        stores,
        warehouses,
        suppliers,
        diagnosticCenters
      });
    })
  );

  router.get(
    '/admin/portal-users',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const roleParam = queryText(req, 'role');
      const roles =
        roleParam && isPortalRole(roleParam as Role)
          ? [roleParam as PortalUserRole]
          : [...PORTAL_USER_ROLES];

      const users = await prisma.user.findMany({
        where: { role: { in: roles } },
        include: userInclude,
        orderBy: [{ role: 'asc' }, { createdAt: 'desc' }]
      });
      res.json({ users: users.map(serializeUser) });
    })
  );

  router.post(
    '/admin/portal-users',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = createSchema.parse(req.body);
      const email = body.email.trim().toLowerCase();
      if (await prisma.user.findFirst({ where: { email, role: body.role } })) {
        return res.status(409).json({ message: 'Email already in use for this role.' });
      }

      if (
        (body.role === Role.RECEPTIONIST ||
          body.role === Role.CLINIC_MANAGER ||
          body.role === Role.DELIVERY_EXECUTIVE) &&
        !body.storeId
      ) {
        return res.status(400).json({ message: 'storeId is required for this role.' });
      }
      if (body.role === Role.SUPPLIER && !body.supplierId) {
        return res.status(400).json({ message: 'supplierId is required.' });
      }
      if (body.role === Role.WAREHOUSE_MANAGER && !body.warehouseId) {
        return res.status(400).json({ message: 'warehouseId is required.' });
      }
      if (body.role === Role.DIAGNOSTIC_PARTNER && !body.diagnosticCenterId) {
        return res.status(400).json({ message: 'diagnosticCenterId is required.' });
      }

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(body.password, 12);
      const base = { name: body.name.trim(), email, passwordHash, role: body.role, isActive: true };

      let user;
      switch (body.role) {
        case Role.RECEPTIONIST:
          await prisma.store.findUniqueOrThrow({ where: { id: body.storeId! } });
          user = await prisma.user.create({
            data: {
              ...base,
              receptionistProfile: {
                create: {
                  storeId: body.storeId!,
                  employeeId: body.employeeId,
                  designation: body.designation ?? 'Receptionist'
                }
              }
            },
            include: userInclude
          });
          break;
        case Role.CLINIC_MANAGER:
          await prisma.store.findUniqueOrThrow({ where: { id: body.storeId! } });
          user = await prisma.user.create({
            data: {
              ...base,
              clinicManagerProfile: {
                create: {
                  storeId: body.storeId!,
                  employeeId: body.employeeId,
                  designation: body.designation ?? 'Clinic Manager'
                }
              }
            },
            include: userInclude
          });
          break;
        case Role.ACCOUNTANT:
          user = await prisma.user.create({
            data: {
              ...base,
              accountantProfile: {
                create: {
                  employeeId: body.employeeId,
                  designation: body.designation ?? 'Accountant'
                }
              }
            },
            include: userInclude
          });
          break;
        case Role.SUPPLIER:
          await prisma.supplier.findUniqueOrThrow({ where: { id: body.supplierId! } });
          user = await prisma.user.create({
            data: {
              ...base,
              supplierProfile: { create: { supplierId: body.supplierId! } }
            },
            include: userInclude
          });
          break;
        case Role.WAREHOUSE_MANAGER:
          await prisma.store.findUniqueOrThrow({ where: { id: body.warehouseId! } });
          user = await prisma.user.create({
            data: {
              ...base,
              warehouseManagerProfile: {
                create: {
                  warehouseId: body.warehouseId!,
                  employeeId: body.employeeId,
                  designation: body.designation ?? 'Warehouse Manager'
                }
              }
            },
            include: userInclude
          });
          break;
        case Role.DELIVERY_EXECUTIVE:
          await prisma.store.findUniqueOrThrow({ where: { id: body.storeId! } });
          user = await prisma.user.create({
            data: {
              ...base,
              deliveryExecutiveProfile: {
                create: {
                  storeId: body.storeId!,
                  employeeId: body.employeeId,
                  designation: body.designation ?? 'Delivery Executive'
                }
              }
            },
            include: userInclude
          });
          break;
        case Role.DIAGNOSTIC_PARTNER:
          await prisma.diagnosticCenter.findUniqueOrThrow({
            where: { id: body.diagnosticCenterId! }
          });
          user = await prisma.user.create({
            data: {
              ...base,
              diagnosticCenterProfile: { create: { diagnosticCenterId: body.diagnosticCenterId! } }
            },
            include: userInclude
          });
          break;
        default:
          return res.status(400).json({ message: 'Unsupported role.' });
      }

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'portal.user.create',
        targetType: 'user',
        targetId: user.id,
        summary: `Created ${body.role} user ${user.name}.`,
        metadata: { email, role: body.role }
      });

      res.status(201).json({ user: serializeUser(user) });
    })
  );

  router.patch(
    '/admin/portal-users/:id/status',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing || !isPortalRole(existing.role)) {
        return res.status(404).json({ message: 'Portal user not found.' });
      }
      const user = await prisma.user.update({
        where: { id },
        data: { isActive },
        include: userInclude
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: isActive ? 'portal.user.activate' : 'portal.user.deactivate',
        targetType: 'user',
        targetId: user.id,
        summary: `${isActive ? 'Activated' : 'Deactivated'} ${user.role} ${user.name}.`
      });
      res.json({ user: serializeUser(user) });
    })
  );

  router.patch(
    '/admin/portal-users/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = updateSchema.parse(req.body);
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing || !isPortalRole(existing.role)) {
        return res.status(404).json({ message: 'Portal user not found.' });
      }

      switch (existing.role) {
        case Role.RECEPTIONIST:
          if (body.storeId) await prisma.store.findUniqueOrThrow({ where: { id: body.storeId } });
          await prisma.receptionistProfile.update({
            where: { userId: id },
            data: {
              storeId: body.storeId,
              employeeId: body.employeeId,
              designation: body.designation
            }
          });
          break;
        case Role.CLINIC_MANAGER:
          if (body.storeId) await prisma.store.findUniqueOrThrow({ where: { id: body.storeId } });
          await prisma.clinicManagerProfile.update({
            where: { userId: id },
            data: {
              storeId: body.storeId,
              employeeId: body.employeeId,
              designation: body.designation
            }
          });
          break;
        case Role.ACCOUNTANT:
          await prisma.accountantProfile.update({
            where: { userId: id },
            data: { employeeId: body.employeeId, designation: body.designation }
          });
          break;
        case Role.SUPPLIER:
          if (body.supplierId) {
            await prisma.supplier.findUniqueOrThrow({ where: { id: body.supplierId } });
            await prisma.supplierProfile.update({
              where: { userId: id },
              data: { supplierId: body.supplierId }
            });
          }
          break;
        case Role.WAREHOUSE_MANAGER:
          if (body.warehouseId) {
            await prisma.store.findUniqueOrThrow({ where: { id: body.warehouseId } });
            await prisma.warehouseManagerProfile.update({
              where: { userId: id },
              data: {
                warehouseId: body.warehouseId,
                employeeId: body.employeeId,
                designation: body.designation
              }
            });
          }
          break;
        case Role.DELIVERY_EXECUTIVE:
          if (body.storeId) await prisma.store.findUniqueOrThrow({ where: { id: body.storeId } });
          await prisma.deliveryExecutiveProfile.update({
            where: { userId: id },
            data: {
              storeId: body.storeId,
              employeeId: body.employeeId,
              designation: body.designation
            }
          });
          break;
        case Role.DIAGNOSTIC_PARTNER:
          if (body.diagnosticCenterId) {
            await prisma.diagnosticCenter.findUniqueOrThrow({
              where: { id: body.diagnosticCenterId }
            });
            await prisma.diagnosticCenterProfile.update({
              where: { userId: id },
              data: { diagnosticCenterId: body.diagnosticCenterId }
            });
          }
          break;
      }

      const user = await prisma.user.findUniqueOrThrow({ where: { id }, include: userInclude });
      res.json({ user: serializeUser(user) });
    })
  );
}
