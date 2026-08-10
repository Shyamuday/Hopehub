import { Router } from 'express';
import { HR_API_ROUTES, HR_ROLES } from '../../constants/hr-api-routes.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';
import { adminOnly, HrRequest } from './shared.js';

export function registerHrUserRoutes(router: Router) {
  // ─── HR User Management (Admin only) ─────────────────────────────────────────

  // POST /hr/users  — super admin creates an HR user
  router.post(
    HR_API_ROUTES.USERS,
    adminOnly,
    asyncRoute(async (req, res) => {
      const { name, email, password, designation, department } = req.body as {
        name: string;
        email: string;
        password: string;
        designation?: string;
        department?: string;
      };

      if (!name || !email || !password) {
        res.status(400).json({ error: 'name, email, and password are required' });
        return;
      }

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 12);

      const normalizedEmail = email.trim().toLowerCase();
      const existing = await prisma.user.findFirst({
        where: { email: normalizedEmail, role: HR_ROLES.HR }
      });
      if (existing) {
        res.status(409).json({ error: 'Email already in use for HR role' });
        return;
      }

      const user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: HR_ROLES.HR,
          hrProfile: {
            create: {
              designation: designation ?? 'HR Manager',
              department: department ?? 'Human Resources'
            }
          }
        },
        include: { hrProfile: true }
      });

      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          hrProfile: user.hrProfile
        }
      });
    })
  );

  // GET /hr/users  — list all HR users
  router.get(
    HR_API_ROUTES.USERS,
    adminOnly,
    asyncRoute(async (_req, res) => {
      const hrUsers = await prisma.user.findMany({
        where: { role: HR_ROLES.HR },
        include: { hrProfile: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ hrUsers });
    })
  );

  // PATCH /hr/users/:id/status — activate/deactivate HR user
  router.patch(
    HR_API_ROUTES.USER_STATUS,
    adminOnly,
    asyncRoute(async (req, res) => {
      const { isActive } = req.body as { isActive: boolean };
      const user = await prisma.user.update({
        where: { id: req.params['id'] as string },
        data: { isActive }
      });
      res.json({ user: { id: user.id, name: user.name, isActive: user.isActive } });
    })
  );

  // GET /hr/users/:id/stores — list stores this HR user can access
  router.get(
    HR_API_ROUTES.USER_STORES,
    adminOnly,
    asyncRoute(async (req, res) => {
      const hrUserId = req.params['id'] as string;
      const accesses = await prisma.hrStoreAccess.findMany({
        where: { hrUserId },
        include: { store: { select: { id: true, name: true, code: true, address: true } } }
      });
      const allStores = await prisma.store.findMany({
        select: { id: true, name: true, code: true, address: true }
      });
      res.json({ assigned: accesses.map((a) => a.store), all: allStores });
    })
  );

  // POST /hr/users/:id/stores — grant HR user access to a store
  router.post(
    HR_API_ROUTES.USER_STORES,
    adminOnly,
    asyncRoute(async (req, res) => {
      const hrUserId = req.params['id'] as string;
      const { storeId } = req.body as { storeId: string };
      const { userId } = (req as HrRequest).hrPayload;

      await prisma.user.findUniqueOrThrow({ where: { id: hrUserId, role: HR_ROLES.HR } });
      await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

      const access = await prisma.hrStoreAccess.upsert({
        where: { hrUserId_storeId: { hrUserId, storeId } },
        create: { hrUserId, storeId, grantedById: userId },
        update: {}
      });
      res.status(201).json({ access });
    })
  );

  // DELETE /hr/users/:id/stores/:storeId — revoke HR user access to a store
  router.delete(
    HR_API_ROUTES.USER_STORE_BY_ID,
    adminOnly,
    asyncRoute(async (req, res) => {
      const hrUserId = req.params['id'] as string;
      const storeId = req.params['storeId'] as string;
      await prisma.hrStoreAccess.deleteMany({ where: { hrUserId, storeId } });
      res.json({ ok: true });
    })
  );

  // POST /hr/users/:id/stores/all — grant access to ALL stores (bulk)
  router.post(
    HR_API_ROUTES.USER_STORES_ALL,
    adminOnly,
    asyncRoute(async (req, res) => {
      const hrUserId = req.params['id'] as string;
      const { userId } = (req as HrRequest).hrPayload;
      const stores = await prisma.store.findMany({ select: { id: true } });
      await prisma.hrStoreAccess.createMany({
        data: stores.map((s) => ({ hrUserId, storeId: s.id, grantedById: userId })),
        skipDuplicates: true
      });
      res.json({ granted: stores.length });
    })
  );
}
