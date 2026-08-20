import { prisma } from '../db.js';
import {
  SITE_CONFIG_DEFAULTS,
  SITE_CONFIG_KEYS,
  SITE_CONFIG_META
} from '../constants/site-config.constants.js';
import {
  GROUP_HELP_CONFIG_DEFAULTS,
  GROUP_HELP_CONFIG_META
} from '../constants/group-help-config.constants.js';
import {
  TELEGRAM_BOT_CONTROL_DEFAULTS,
  TELEGRAM_BOT_CONTROL_META
} from '../constants/telegram-bot-controls.constants.js';

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
const REGISTERED_RUNTIME_CONFIG_KEYS = new Set([
  ...Object.keys(SITE_CONFIG_META),
  ...Object.keys(GROUP_HELP_CONFIG_META),
  ...Object.keys(TELEGRAM_BOT_CONTROL_META)
]);
const runtimeFallbackRepairs = new Map<string, Promise<void>>();
const reportedUnknownKeys = new Set<string>();

export type ManagedSiteConfigEntry = { key: string; value: string; label: string };
export type SiteConfigResolution = {
  value: string;
  source: 'database' | 'managed-fallback' | 'missing-primary' | 'unregistered';
};

export function resolveSiteConfigValue(
  key: string,
  savedValue: string | undefined
): SiteConfigResolution {
  if (savedValue !== undefined) return { value: savedValue, source: 'database' };
  if (Object.prototype.hasOwnProperty.call(RUNTIME_CONFIG_DEFAULTS, key)) {
    return { value: RUNTIME_CONFIG_DEFAULTS[key] ?? '', source: 'managed-fallback' };
  }
  if (REGISTERED_RUNTIME_CONFIG_KEYS.has(key)) {
    return { value: '', source: 'missing-primary' };
  }
  return { value: '', source: 'unregistered' };
}

function siteConfigLabel(key: string) {
  return (
    SITE_CONFIG_META[key]?.label ||
    GROUP_HELP_CONFIG_META[key]?.label ||
    TELEGRAM_BOT_CONTROL_META[key as keyof typeof TELEGRAM_BOT_CONTROL_META]?.label ||
    key
  );
}

async function repairRuntimeFallback(key: string, value: string) {
  const existing = runtimeFallbackRepairs.get(key);
  if (existing) return existing;

  const repair = (async () => {
    const label = siteConfigLabel(key);
    console.warn(
      `[site-config] Managed fallback used for missing database key "${key}"; repairing the primary configuration row.`
    );
    await prisma.$transaction([
      prisma.siteConfig.upsert({
        where: { key },
        create: { key, value, label },
        update: {}
      }),
      prisma.siteConfig.upsert({
        where: { key: `${MANAGED_SITE_CONFIG_DEFAULT_PREFIX}${key}` },
        create: {
          key: `${MANAGED_SITE_CONFIG_DEFAULT_PREFIX}${key}`,
          value,
          label: `Managed default snapshot for ${label}`
        },
        update: { value, label: `Managed default snapshot for ${label}` }
      }),
      prisma.auditLog.create({
        data: {
          action: 'site_config.runtime_fallback_repaired',
          targetType: 'site_config',
          targetId: key,
          summary: `Recovered missing site configuration "${key}" from its managed default.`,
          metadata: {
            key,
            source: 'managed-fallback',
            reason: 'missing_database_row',
            persistence: 'create_primary_if_still_missing'
          }
        }
      })
    ]);
  })().finally(() => runtimeFallbackRepairs.delete(key));

  runtimeFallbackRepairs.set(key, repair);
  return repair;
}

async function reportMissingRuntimeKey(key: string, source: 'missing-primary' | 'unregistered') {
  if (reportedUnknownKeys.has(key)) return;
  reportedUnknownKeys.add(key);
  const registered = source === 'missing-primary';
  const action = registered
    ? 'site_config.missing_primary_value'
    : 'site_config.unregistered_runtime_key';
  const reason = registered
    ? 'missing_database_row_without_default'
    : 'missing_default_registration';
  const summary = registered
    ? `Registered site configuration "${key}" is missing from the primary database and has no managed default.`
    : `Unregistered site configuration key "${key}" was requested at runtime.`;
  console.error(`[site-config] ${summary}`);
  try {
    await prisma.auditLog.create({
      data: {
        action,
        targetType: 'site_config',
        targetId: key,
        summary,
        metadata: { key, source, reason, valuePersisted: false }
      }
    });
  } catch (error) {
    console.error(`[site-config] Could not audit missing key "${key}".`, error);
  }
}

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
  const uniqueKeys = [...new Set(keys)];
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: uniqueKeys } } });
  const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const resolved = uniqueKeys.map((key) => ({ key, ...resolveSiteConfigValue(key, saved[key]) }));

  await Promise.all(
    resolved.map(async ({ key, value, source }) => {
      if (source === 'managed-fallback') {
        try {
          await repairRuntimeFallback(key, value);
        } catch (error) {
          console.error(
            `[site-config] Could not persist managed fallback for "${key}"; this request will continue with the safe fallback.`,
            error
          );
        }
      } else if (source === 'missing-primary' || source === 'unregistered') {
        await reportMissingRuntimeKey(key, source);
      }
    })
  );

  return Object.fromEntries(resolved.map(({ key, value }) => [key, value])) as Record<
    string,
    string
  >;
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
