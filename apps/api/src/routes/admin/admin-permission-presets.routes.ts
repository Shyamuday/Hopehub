import { Router } from 'express';
import { authRequired } from '../../auth.js';
import { asyncRoute } from '../../utils/helpers.js';
import { allowStaffManagers } from '../../staff-permissions.js';
import { getPermissionPresetsPayload } from '../../staff-role-presets.js';
import { ALL_PERMISSION_CODES, PERMISSION_LABELS } from '../../staff-permissions.js';

export function registerAdminPermissionPresetRoutes(router: Router) {
  router.get(
    '/admin/permission-presets',
    authRequired,
    allowStaffManagers,
    asyncRoute(async (_req, res) => {
      res.json({
        ...getPermissionPresetsPayload(),
        permissions: ALL_PERMISSION_CODES.map((code) => ({
          code,
          label: PERMISSION_LABELS[code as keyof typeof PERMISSION_LABELS] ?? code
        }))
      });
    })
  );
}
