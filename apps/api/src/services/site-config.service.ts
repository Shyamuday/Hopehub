import { prisma } from '../db.js';
import {
  SITE_CONFIG_DEFAULTS,
  SITE_CONFIG_KEYS,
  SITE_CONFIG_META
} from '../constants/site-config.constants.js';
import { GROUP_HELP_CONFIG_DEFAULTS } from '../constants/group-help-config.constants.js';
import { TELEGRAM_BOT_CONTROL_DEFAULTS } from '../constants/telegram-bot-controls.constants.js';

/**
 * A snapshot lets deployments refresh a built-in default without ever replacing
 * a value an administrator has changed in production.
 */
export const MANAGED_SITE_CONFIG_DEFAULT_PREFIX = 'system:site-config:default:';
export const MANAGED_SITE_CONFIG_OVERRIDE_PREFIX = 'system:site-config:override:';
const LEGACY_TELEGRAM_DEFAULT_PREFIX = 'system:telegram-group-help:default:';
const LEGACY_GROUP_HELP_OVERRIDE_PREFIX = '__system:group-help-default:';

const RUNTIME_CONFIG_DEFAULTS: Record<string, string> = {
  ...SITE_CONFIG_DEFAULTS,
  ...GROUP_HELP_CONFIG_DEFAULTS,
  ...TELEGRAM_BOT_CONTROL_DEFAULTS
};

export type ManagedSiteConfigEntry = { key: string; value: string; label: string };

export function shouldUseManagedDefault(input: {
  current: string | undefined;
  previousDefault: string | undefined;
  explicitlyOverridden: boolean;
}) {
  return (
    input.current == null ||
    (!input.explicitlyOverridden &&
      input.previousDefault != null &&
      input.current === input.previousDefault)
  );
}

export async function getSiteConfigMap(keys: readonly string[]) {
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: [...keys] } } });
  const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(
    keys.map((key) => [key, saved[key] ?? RUNTIME_CONFIG_DEFAULTS[key] ?? ''])
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
  await syncManagedConfigDefaults(
    SITE_CONFIG_KEYS.map((key) => ({
      key,
      value: SITE_CONFIG_DEFAULTS[key] ?? '',
      label: SITE_CONFIG_META[key].label
    }))
  );
}

/**
 * Reconciles code-owned bootstrap defaults with the database. Existing admin
 * values are preserved, including the edge case where an admin deliberately
 * saved the same value as the old default.
 */
export async function syncManagedConfigDefaults(entries: ManagedSiteConfigEntry[]) {
  const keys = entries.flatMap(({ key }) => [
    key,
    `${MANAGED_SITE_CONFIG_DEFAULT_PREFIX}${key}`,
    `${MANAGED_SITE_CONFIG_OVERRIDE_PREFIX}${key}`,
    `${LEGACY_TELEGRAM_DEFAULT_PREFIX}${key}`,
    `${LEGACY_GROUP_HELP_OVERRIDE_PREFIX}${key}`
  ]);
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: keys } } });
  const saved = new Map(rows.map((row) => [row.key, row]));

  await prisma.$transaction(
    entries.flatMap(({ key, value, label }) => {
      const current = saved.get(key);
      const snapshot =
        saved.get(`${MANAGED_SITE_CONFIG_DEFAULT_PREFIX}${key}`) ||
        saved.get(`${LEGACY_TELEGRAM_DEFAULT_PREFIX}${key}`);
      const explicitlyOverridden = Boolean(
        saved.get(`${MANAGED_SITE_CONFIG_OVERRIDE_PREFIX}${key}`) ||
        saved.get(`${LEGACY_GROUP_HELP_OVERRIDE_PREFIX}${key}`)
      );
      const useNewDefault = shouldUseManagedDefault({
        current: current?.value,
        previousDefault: snapshot?.value,
        explicitlyOverridden
      });

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
          update: { value, label: `Managed default snapshot for ${label}` }
        })
      ];
    })
  );
}

export async function markSiteConfigOverrides(entries: Array<{ key: string; value: string }>) {
  if (!entries.length) return;
  await prisma.$transaction(
    entries.map(({ key, value }) =>
      prisma.siteConfig.upsert({
        where: { key: `${MANAGED_SITE_CONFIG_OVERRIDE_PREFIX}${key}` },
        create: {
          key: `${MANAGED_SITE_CONFIG_OVERRIDE_PREFIX}${key}`,
          value,
          label: `Administrator override marker for ${key}`
        },
        update: { value }
      })
    )
  );
}

export async function clearSiteConfigOverride(key: string) {
  await prisma.siteConfig.deleteMany({
    where: {
      key: {
        in: [
          `${MANAGED_SITE_CONFIG_OVERRIDE_PREFIX}${key}`,
          `${LEGACY_GROUP_HELP_OVERRIDE_PREFIX}${key}`
        ]
      }
    }
  });
}
