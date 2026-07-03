import { Router } from 'express';
import { EmployeeStatus } from '@prisma/client';
import { HR_API_ROUTES, HR_ROLES } from '../../constants/hr-api-routes.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';
import { getAccess, hrAuthMiddleware } from './shared.js';

export function registerHrStoreRoutes(router: Router) {
// ─── Store & Manager Management (HR can create/manage) ───────────────────────

// GET /hr/stores — list only accessible stores
router.get(HR_API_ROUTES.STORES, hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { storeIds } = getAccess(req);
  const stores = await prisma.store.findMany({
    where: storeIds ? { id: { in: storeIds } } : {},
    include: {
      _count: { select: { staff: true } },
      staff: { where: { role: HR_ROLES.MANAGER }, select: { id: true, name: true, email: true, isActive: true, employeeStatus: true } },
      hrAccess: { include: { hrUser: { select: { id: true, name: true, email: true } } } }
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ stores });
}));

// POST /hr/stores — HR creates a new store
router.post('/stores', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { name, code, address, phone } = req.body as {
    name: string; code: string; address?: string; phone?: string;
  };
  if (!name || !code) { res.status(400).json({ error: 'name and code are required' }); return; }

  const existing = await prisma.store.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) { res.status(409).json({ error: 'Store code already exists' }); return; }

  const store = await prisma.store.create({
    data: { name, code: code.toUpperCase(), address, phone }
  });
  res.status(201).json({ store });
}));

// GET /hr/stores/:storeId — store detail with full staff roster
router.get('/stores/:storeId', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const storeId = req.params['storeId'] as string;
  const { storeIds } = getAccess(req);
  if (storeIds && !storeIds.includes(storeId)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      _count: { select: { staff: true } },
      staff: {
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          staffCode: true,
          email: true,
          phone: true,
          role: true,
          designation: true,
          isActive: true,
          employeeStatus: true,
          joiningDate: true
        }
      },
      hrAccess: { include: { hrUser: { select: { id: true, name: true, email: true } } } }
    }
  });

  if (!store) {
    res.status(404).json({ error: 'Store not found' });
    return;
  }
  res.json({ store });
}));

// PATCH /hr/stores/:storeId — update store details or active flag
router.patch('/stores/:storeId', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const storeId = req.params['storeId'] as string;
  const { storeIds } = getAccess(req);
  if (storeIds && !storeIds.includes(storeId)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const { name, address, phone, isActive } = req.body as {
    name?: string;
    address?: string;
    phone?: string;
    isActive?: boolean;
  };

  const store = await prisma.store.update({
    where: { id: storeId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(isActive !== undefined ? { isActive } : {})
    },
    include: {
      _count: { select: { staff: true } },
      staff: { where: { role: HR_ROLES.MANAGER }, select: { id: true, name: true, email: true, isActive: true, employeeStatus: true } },
      hrAccess: { include: { hrUser: { select: { id: true, name: true, email: true } } } }
    }
  });
  res.json({ store });
}));

// POST /hr/stores/:storeId/managers — HR creates a store manager
router.post(HR_API_ROUTES.STORE_MANAGERS, hrAuthMiddleware, asyncRoute(async (req, res) => {
  const storeId = req.params['storeId'] as string;
  const { name, email, password, designation, joiningDate } = req.body as {
    name: string; email: string; password: string; designation?: string; joiningDate?: string;
  };
  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' }); return;
  }

  await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

  const bcrypt = await import('bcryptjs');
  const pinHash = await bcrypt.hash(password, 10);

  // Generate unique staff code
  const count = await prisma.storeStaff.count({ where: { storeId } });
  const staffCode = `MGR-${String(count + 1).padStart(3, '0')}`;

  const manager = await prisma.storeStaff.create({
    data: {
      name,
      staffCode,
      email,
      pinHash,
      role: HR_ROLES.MANAGER,
      storeId,
      designation: designation ?? 'Store Manager',
      department: 'Store Management',
      joiningDate: joiningDate ? new Date(joiningDate) : undefined
    },
    include: { store: { select: { name: true } } }
  });

  res.status(201).json({
    staff: {
      id: manager.id,
      name: manager.name,
      staffCode: manager.staffCode,
      email: manager.email,
      role: manager.role,
      storeName: manager.store.name
    }
  });
}));

// POST /hr/stores/:storeId/staff — HR creates a regular store staff member
router.post(HR_API_ROUTES.STORE_STAFF_CREATE, hrAuthMiddleware, asyncRoute(async (req, res) => {
  const storeId = req.params['storeId'] as string;
  const { name, staffCode, pin, designation, phone, joiningDate } = req.body as {
    name: string; staffCode: string; pin: string;
    designation?: string; phone?: string; joiningDate?: string;
  };
  if (!name || !staffCode || !pin) {
    res.status(400).json({ error: 'name, staffCode, and pin are required' }); return;
  }
  if (pin.length < 4) { res.status(400).json({ error: 'PIN must be at least 4 digits' }); return; }

  await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

  const existing = await prisma.storeStaff.findUnique({ where: { staffCode: staffCode.toUpperCase() } });
  if (existing) { res.status(409).json({ error: 'Staff code already taken' }); return; }

  const bcrypt = await import('bcryptjs');
  const pinHash = await bcrypt.hash(pin, 10);

  const staff = await prisma.storeStaff.create({
    data: {
      name,
      staffCode: staffCode.toUpperCase(),
      pinHash,
      phone,
      designation: designation ?? 'Store Staff',
      department: 'Store Operations',
      role: 'STAFF',
      storeId,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined
    },
    include: { store: { select: { name: true } } }
  });

  res.status(201).json({
    staff: {
      id: staff.id,
      name: staff.name,
      staffCode: staff.staffCode,
      role: staff.role,
      storeName: staff.store.name
    }
  });
}));

// PATCH /hr/store/staff/:id/status — HR can activate/deactivate staff
router.patch(HR_API_ROUTES.STORE_STAFF_STATUS, hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { isActive, employeeStatus } = req.body as { isActive?: boolean; employeeStatus?: EmployeeStatus };
  const staff = await prisma.storeStaff.update({
    where: { id: req.params['id'] as string },
    data: { isActive, employeeStatus }
  });
  res.json({ staff: { id: staff.id, name: staff.name, isActive: staff.isActive, employeeStatus: staff.employeeStatus } });
}));
}
