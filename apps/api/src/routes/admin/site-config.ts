import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import {
  SITE_CONFIG_DEFAULTS,
  SITE_CONFIG_KEYS,
  SITE_CONFIG_META
} from '../../constants/site-config.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

export function registerAdminSiteConfigRoutes(router: Router) {
  /** GET all known site config entries (fills in defaults for missing keys). */
  router.get(
    '/admin/site-config',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const rows = await prisma.siteConfig.findMany({ where: { key: { in: SITE_CONFIG_KEYS } } });
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

      const config = SITE_CONFIG_KEYS.map((key) => ({
        key,
        value: map[key] ?? SITE_CONFIG_DEFAULTS[key] ?? '',
        label: SITE_CONFIG_META[key].label,
        description: SITE_CONFIG_META[key].description
      }));

      res.json({ config });
    })
  );

  /** PATCH a single site config key. */
  router.patch(
    '/admin/site-config/:key',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const key = routeParam(req, 'key');
      if (!SITE_CONFIG_KEYS.includes(key)) {
        return res.status(400).json({ message: `Unknown config key: ${key}` });
      }

      const { value } = z.object({ value: z.string().min(1).max(1000) }).parse(req.body);

      const row = await prisma.siteConfig.upsert({
        where: { key },
        create: { key, value, label: SITE_CONFIG_META[key].label },
        update: { value }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'site_config.update',
        targetType: 'site_config',
        targetId: key,
        summary: `Site config "${key}" updated to "${value}".`,
        metadata: { key, value }
      });

      res.json({ config: row });
    })
  );
}
