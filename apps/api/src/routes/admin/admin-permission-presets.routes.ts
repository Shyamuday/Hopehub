import type express from 'express';
import { Role } from '@prisma/client';
import { allowRoles, authRequired } from '../../auth.js';
import { asyncRoute } from '../../middleware/async-route.js';
import { getPermissionPresetsPayload } from '../../staff-role-presets.js';

/** Catalog of recommended role → permission bundles (any admin may read; assignment still requires STAFF_WRITE). */
export function registerAdminPermissionPresetRoutes(app: express.Application) {
  app.get(
    '/admin/permission-presets',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      res.json(getPermissionPresetsPayload());
    })
  );
}
