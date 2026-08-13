import { Router } from 'express';
import { Role, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  asyncRoute,
  queryPositiveInt,
  queryText,
  routeParam,
  writeAuditLog
} from '../../utils/helpers.js';

const allRoles = Object.values(Role);
const userRoleSchema = z.object({ role: z.nativeEnum(Role) });
const userStatusSchema = z.object({ isActive: z.boolean() });

const userListSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  role: true,
  isActive: true,
  patientCode: true,
  createdAt: true,
  updatedAt: true,
  homeClinicStore: { select: { id: true, name: true, code: true } },
  doctorProfile: { select: { id: true, specialty: true } }
} satisfies Prisma.UserSelect;

function toUserListItem(user: {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  role: Role;
  isActive: boolean;
  patientCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  homeClinicStore: { id: string; name: string; code: string } | null;
  doctorProfile: { id: string; specialty: string } | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    isActive: user.isActive,
    patientCode: user.patientCode,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    homeClinicStore: user.homeClinicStore,
    doctorProfile: user.doctorProfile
  };
}

export function registerAdminUserRoutes(router: Router) {
  router.get(
    '/admin/users',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const q = queryText(req, 'q').trim();
      const roleParam = queryText(req, 'role').trim();
      const status = queryText(req, 'status').trim().toLowerCase();
      const createdFrom = queryText(req, 'createdFrom').trim();
      const createdTo = queryText(req, 'createdTo').trim();
      const sortByParam = queryText(req, 'sortBy').trim();
      const sortDirection =
        queryText(req, 'sortDirection').trim().toLowerCase() === 'asc' ? 'asc' : 'desc';

      const role = allRoles.includes(roleParam as Role) ? (roleParam as Role) : undefined;
      const createdAt: Prisma.DateTimeFilter = {};
      if (createdFrom) {
        const from = new Date(createdFrom);
        if (!Number.isNaN(from.getTime())) createdAt.gte = from;
      }
      if (createdTo) {
        const to = new Date(createdTo);
        if (!Number.isNaN(to.getTime())) createdAt.lte = to;
      }

      const where: Prisma.UserWhereInput = {
        ...(role ? { role } : {}),
        ...(status === 'active' ? { isActive: true } : {}),
        ...(status === 'inactive' ? { isActive: false } : {}),
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { mobile: { contains: q, mode: 'insensitive' } },
                { patientCode: { contains: q, mode: 'insensitive' } },
                { id: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const orderBy: Prisma.UserOrderByWithRelationInput =
        sortByParam === 'name'
          ? { name: sortDirection }
          : sortByParam === 'role'
            ? { role: sortDirection }
            : sortByParam === 'updatedAt'
              ? { updatedAt: sortDirection }
              : { createdAt: sortDirection };

      const [total, users, roleCounts] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: userListSelect,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.user.groupBy({ by: ['role'], _count: { _all: true } })
      ]);

      res.json({
        users: users.map(toUserListItem),
        filters: {
          roles: allRoles,
          statuses: ['active', 'inactive']
        },
        summary: {
          total,
          roleCounts: roleCounts.map((row) => ({ role: row.role, count: row._count._all }))
        },
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
      });
    })
  );

  router.patch(
    '/admin/users/:id/role',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const userId = routeParam(req, 'id');
      const parsed = userRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'A valid role is required.' });
      }

      if (userId === req.user!.id && parsed.data.role !== Role.ADMIN) {
        return res.status(400).json({ message: 'You cannot remove your own admin role.' });
      }

      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, isActive: true }
      });
      if (!existing) return res.status(404).json({ message: 'User not found.' });

      if (existing.role === Role.ADMIN && parsed.data.role !== Role.ADMIN) {
        const otherActiveAdmins = await prisma.user.count({
          where: { id: { not: userId }, role: Role.ADMIN, isActive: true }
        });
        if (otherActiveAdmins === 0) {
          return res.status(400).json({ message: 'At least one active admin must remain.' });
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { role: parsed.data.role },
        select: userListSelect
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'user.role.update',
        targetType: 'user',
        targetId: user.id,
        summary: `Changed ${user.name}'s role from ${existing.role} to ${user.role}.`,
        metadata: { email: user.email, previousRole: existing.role, newRole: user.role }
      });

      res.json({ user: toUserListItem(user) });
    })
  );

  router.patch(
    '/admin/users/:id/status',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const userId = routeParam(req, 'id');
      const parsed = userStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'A valid active status is required.' });
      }

      if (userId === req.user!.id && parsed.data.isActive === false) {
        return res.status(400).json({ message: 'You cannot deactivate your own account.' });
      }

      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, isActive: true }
      });
      if (!existing) return res.status(404).json({ message: 'User not found.' });

      if (existing.role === Role.ADMIN && parsed.data.isActive === false) {
        const otherActiveAdmins = await prisma.user.count({
          where: { id: { not: userId }, role: Role.ADMIN, isActive: true }
        });
        if (otherActiveAdmins === 0) {
          return res.status(400).json({ message: 'At least one active admin must remain.' });
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: parsed.data.isActive },
        select: userListSelect
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: user.isActive ? 'user.activate' : 'user.deactivate',
        targetType: 'user',
        targetId: user.id,
        summary: `${user.isActive ? 'Activated' : 'Deactivated'} user ${user.name}.`,
        metadata: { email: user.email, role: user.role, previousIsActive: existing.isActive }
      });

      res.json({ user: toUserListItem(user) });
    })
  );

  router.get(
    '/admin/admins',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const admins = await prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ admins });
    })
  );

  router.post(
    '/admin/admins',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const { name, email, password, mobile } = req.body as {
        name: string;
        email: string;
        password: string;
        mobile?: string;
      };

      if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = await prisma.user.findFirst({
        where: { email: normalizedEmail, role: Role.ADMIN }
      });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use for admin role.' });
      }

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 12);

      const admin = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          mobile: mobile?.trim() || null,
          passwordHash,
          role: Role.ADMIN,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          isActive: true,
          createdAt: true
        }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'admin.create',
        targetType: 'user',
        targetId: admin.id,
        summary: `Created admin account for ${admin.name}.`,
        metadata: { email: admin.email }
      });

      res.status(201).json({ admin });
    })
  );

  router.patch(
    '/admin/admins/:id/status',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const adminId = routeParam(req, 'id');
      const { isActive } = req.body as { isActive: boolean };

      if (adminId === req.user!.id && isActive === false) {
        return res.status(400).json({ message: 'You cannot deactivate your own admin account.' });
      }

      const admin = await prisma.user.update({
        where: { id: adminId, role: Role.ADMIN },
        data: { isActive },
        select: { id: true, name: true, email: true, isActive: true }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: isActive ? 'admin.activate' : 'admin.deactivate',
        targetType: 'user',
        targetId: admin.id,
        summary: `${isActive ? 'Activated' : 'Deactivated'} admin ${admin.name}.`,
        metadata: { email: admin.email }
      });

      res.json({ admin });
    })
  );
}
