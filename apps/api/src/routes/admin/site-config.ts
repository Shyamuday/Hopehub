import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import {
  SITE_CONFIG_DEFAULTS,
  SITE_CONFIG_KEYS,
  SITE_CONFIG_META,
  REQUIRED_PUBLIC_SITE_CONFIG_KEYS
} from '../../constants/site-config.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';
import {
  clearSiteConfigOverride,
  MANAGED_SITE_CONFIG_DEFAULT_PREFIX,
  MANAGED_SITE_CONFIG_OVERRIDE_PREFIX,
  markSiteConfigOverrides
} from '../../services/site-config.service.js';

const siteConfigEntriesSchema = z.object({
  entries: z
    .array(z.object({ key: z.string(), value: z.string().max(1000) }))
    .min(1)
    .max(SITE_CONFIG_KEYS.length)
});

function validateSiteConfigEntries(entries: Array<{ key: string; value: string }>) {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!SITE_CONFIG_KEYS.includes(entry.key)) {
      throw new Error(`Unknown config key: ${entry.key}`);
    }
    if (seen.has(entry.key)) {
      throw new Error(`The setting "${entry.key}" was included more than once.`);
    }
    seen.add(entry.key);
    if (!entry.value.trim() && REQUIRED_PUBLIC_SITE_CONFIG_KEYS.includes(entry.key as never)) {
      throw new Error(
        `${SITE_CONFIG_META[entry.key].label} cannot be empty because it is required on the public site.`
      );
    }
  }
}

export function registerAdminSiteConfigRoutes(router: Router) {
  /** GET all known site config entries (fills in defaults for missing keys). */
  router.get(
    '/admin/site-config',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const rows = await prisma.siteConfig.findMany({
        where: {
          key: {
            in: SITE_CONFIG_KEYS.flatMap((key) => [
              key,
              `${MANAGED_SITE_CONFIG_DEFAULT_PREFIX}${key}`,
              `${MANAGED_SITE_CONFIG_OVERRIDE_PREFIX}${key}`
            ])
          }
        }
      });
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

      const config = SITE_CONFIG_KEYS.map((key) => ({
        key,
        value: map[key] ?? SITE_CONFIG_DEFAULTS[key] ?? '',
        label: SITE_CONFIG_META[key].label,
        description: SITE_CONFIG_META[key].description,
        source:
          map[`${MANAGED_SITE_CONFIG_OVERRIDE_PREFIX}${key}`] == null &&
          (map[key] == null || map[key] === map[`${MANAGED_SITE_CONFIG_DEFAULT_PREFIX}${key}`])
            ? 'default'
            : 'custom'
      }));

      res.json({ config });
    })
  );

  /** Save multiple site settings in one atomic operation. */
  router.patch(
    '/admin/site-config',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const parsed = siteConfigEntriesSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid site settings payload.' });
      }
      try {
        validateSiteConfigEntries(parsed.data.entries);
      } catch (error) {
        return res.status(400).json({
          message: error instanceof Error ? error.message : 'Invalid site settings payload.'
        });
      }

      const entries = parsed.data.entries.map(({ key, value }) => ({ key, value: value.trim() }));
      const rows = await prisma.$transaction(
        entries.map(({ key, value }) =>
          prisma.siteConfig.upsert({
            where: { key },
            create: { key, value, label: SITE_CONFIG_META[key].label },
            update: { value, label: SITE_CONFIG_META[key].label }
          })
        )
      );
      await markSiteConfigOverrides(entries);
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'site_config.bulk_update',
        targetType: 'site_config',
        targetId: 'bulk',
        summary: `Updated ${entries.length} site setting(s).`,
        metadata: { entries }
      });
      res.json({ config: rows });
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

      const { value } = z.object({ value: z.string().max(1000) }).parse(req.body);
      try {
        validateSiteConfigEntries([{ key, value }]);
      } catch (error) {
        return res.status(400).json({
          message: error instanceof Error ? error.message : 'Invalid site settings payload.'
        });
      }

      const row = await prisma.siteConfig.upsert({
        where: { key },
        create: { key, value, label: SITE_CONFIG_META[key].label },
        update: { value }
      });
      await markSiteConfigOverrides([{ key, value }]);

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

  /** Restore one setting to the current built-in default. */
  router.post(
    '/admin/site-config/:key/restore-default',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const key = routeParam(req, 'key');
      if (!SITE_CONFIG_KEYS.includes(key)) {
        return res.status(400).json({ message: `Unknown config key: ${key}` });
      }
      const value = SITE_CONFIG_DEFAULTS[key] ?? '';
      const row = await prisma.siteConfig.upsert({
        where: { key },
        create: { key, value, label: SITE_CONFIG_META[key].label },
        update: { value, label: SITE_CONFIG_META[key].label }
      });
      await clearSiteConfigOverride(key);
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'site_config.restore_default',
        targetType: 'site_config',
        targetId: key,
        summary: `Site config "${key}" restored to its managed default.`,
        metadata: { key, value }
      });
      res.json({ config: row, source: 'default' });
    })
  );
}
