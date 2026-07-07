import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { STORE_API_ROUTES, STORE_ROLES } from '../../constants/store-api-routes.constants.js';
import { sessionPayloadForStoreStaff } from '../../constants/rbac-helpers.js';
import { enrichWithProfileImageUrl, storeStaffProfileImagePath } from '../../utils/profile-image-url.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';
import { signStoreToken } from './shared.js';

async function loginStoreStaffByEmail(email: string, password: string) {
  const staff = await prisma.storeStaff.findFirst({
    where: { email, isActive: true },
    include: { store: { select: { id: true, name: true } } }
  });

  if (!staff) {
    return null;
  }

  const isValid = await bcrypt.compare(password, staff.pinHash);
  if (!isValid) {
    return null;
  }

  const token = signStoreToken({
    staffId: staff.id,
    storeId: staff.storeId,
    role: staff.role as typeof STORE_ROLES.MANAGER | typeof STORE_ROLES.STAFF,
    name: staff.name
  });

  const session = sessionPayloadForStoreStaff({
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    staffCode: staff.staffCode,
    storeId: staff.storeId,
    storeName: staff.store.name,
    profileImageKey: staff.profileImageKey
  });

  return {
    token,
    staff: enrichWithProfileImageUrl(
      {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        staffCode: staff.staffCode,
        storeId: staff.storeId,
        storeName: staff.store.name,
        profileImageKey: staff.profileImageKey
      },
      storeStaffProfileImagePath
    ),
    ...session
  };
}

export function registerStoreAuthRoutes(router: Router) {
  const emailLoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

  router.post(
    STORE_API_ROUTES.AUTH_LOGIN,
    asyncRoute(async (req, res) => {
      const body = emailLoginSchema.parse(req.body);
      const result = await loginStoreStaffByEmail(body.email, body.password);
      if (!result) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }
      res.json(result);
    })
  );

  router.post(
    STORE_API_ROUTES.AUTH_MANAGER_LOGIN,
    asyncRoute(async (req, res) => {
      const body = emailLoginSchema.parse(req.body);
      const result = await loginStoreStaffByEmail(body.email, body.password);
      if (!result || result.staff.role !== STORE_ROLES.MANAGER) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }
      res.json(result);
    })
  );
}
