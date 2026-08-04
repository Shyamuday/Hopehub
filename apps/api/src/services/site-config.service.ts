import { prisma } from '../db.js';
import { SITE_CONFIG_DEFAULTS } from '../constants/site-config.constants.js';

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
