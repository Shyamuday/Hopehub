import { prisma } from '../db.js';
import {
  SITE_CONFIG_DEFAULTS,
  SITE_CONFIG_KEYS,
  SITE_CONFIG_META
} from '../constants/site-config.constants.js';

/**
 * A snapshot lets deployments refresh a built-in default without ever replacing
 * a value an administrator has changed in production.
 */
export const MANAGED_SITE_CONFIG_DEFAULT_PREFIX = 'system:site-config:default:';

export async function getSiteConfigMap(keys: readonly string[]) {
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: [...keys] } } });
  const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(
    keys.map((key) => [key, saved[key] ?? SITE_CONFIG_DEFAULTS[key] ?? ''])
  ) as Record<string, string>;
}

export async function getSiteConfigValue(key: string) {
  const config = await getSiteConfigMap([key]);
  return config[key] ?? '';
}

/**
 * Run during the production seed. Missing settings are created and settings
 * still equal to their previously managed default are updated. Any different
 * live value is treated as an administrator override and is preserved.
 */
export async function syncManagedSiteConfigDefaults() {
  const keys = SITE_CONFIG_KEYS.flatMap((key) => [
    key,
    `${MANAGED_SITE_CONFIG_DEFAULT_PREFIX}${key}`
  ]);
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: keys } } });
  const saved = new Map(rows.map((row) => [row.key, row]));

  await prisma.$transaction(
    SITE_CONFIG_KEYS.flatMap((key) => {
      const value = SITE_CONFIG_DEFAULTS[key] ?? '';
      const current = saved.get(key);
      const snapshot = saved.get(`${MANAGED_SITE_CONFIG_DEFAULT_PREFIX}${key}`);
      const useNewDefault = !current || (snapshot != null && current.value === snapshot.value);
      const label = SITE_CONFIG_META[key].label;

      return [
        current
          ? prisma.siteConfig.update({
              where: { key },
              data: { label, ...(useNewDefault ? { value } : {}) }
            })
          : prisma.siteConfig.create({ data: { key, value, label } }),
        prisma.siteConfig.upsert({
          where: { key: `${MANAGED_SITE_CONFIG_DEFAULT_PREFIX}${key}` },
          create: {
            key: `${MANAGED_SITE_CONFIG_DEFAULT_PREFIX}${key}`,
            value,
            label: `Managed default snapshot for ${label}`
          },
          update: { value }
        })
      ];
    })
  );
}
