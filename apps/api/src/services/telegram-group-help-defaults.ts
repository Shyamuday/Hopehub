import { prisma } from '../db.js';
import {
  GROUP_HELP_CONFIG_DEFAULTS,
  GROUP_HELP_CONFIG_KEYS
} from '../constants/group-help-config.constants.js';

const DEFAULT_STATE_PREFIX = '__system:group-help-default:';
const DEFAULT_SYNC_INTERVAL_MS = 30_000;

type ManagedDefaultState = {
  managed: boolean;
  value: string;
};

let lastSyncAt = 0;
let syncInFlight: Promise<void> | null = null;

function stateKey(key: string) {
  return `${DEFAULT_STATE_PREFIX}${key}`;
}

function encodeState(state: ManagedDefaultState) {
  return JSON.stringify(state);
}

function decodeState(value: string | undefined): ManagedDefaultState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ManagedDefaultState>;
    if (typeof parsed.managed !== 'boolean' || typeof parsed.value !== 'string') return null;
    return { managed: parsed.managed, value: parsed.value };
  } catch {
    return null;
  }
}

/**
 * Keeps code-owned defaults current without overwriting an administrator's saved value.
 * Once an admin saves a field, it is marked as an override. Defaults that are untouched
 * are upgraded automatically when a new application version changes them.
 */
export async function syncGroupHelpConfigDefaults(force = false) {
  if (!force && Date.now() - lastSyncAt < DEFAULT_SYNC_INTERVAL_MS) return;
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const keys = [...GROUP_HELP_CONFIG_KEYS];
    const [configRows, stateRows] = await Promise.all([
      prisma.siteConfig.findMany({ where: { key: { in: keys } } }),
      prisma.siteConfig.findMany({ where: { key: { in: keys.map(stateKey) } } })
    ]);
    const configValues = new Map(configRows.map((row) => [row.key, row.value]));
    const states = new Map(
      stateRows.map((row) => [row.key.slice(DEFAULT_STATE_PREFIX.length), decodeState(row.value)])
    );
    const updates = [] as ReturnType<typeof prisma.siteConfig.upsert>[];

    for (const key of keys) {
      const defaultValue = GROUP_HELP_CONFIG_DEFAULTS[key] ?? '';
      const currentValue = configValues.get(key);
      const state = states.get(key) ?? null;

      if (currentValue === undefined) {
        updates.push(
          prisma.siteConfig.upsert({
            where: { key },
            create: { key, value: defaultValue, label: 'Group Help default' },
            update: { value: defaultValue }
          })
        );
        updates.push(
          prisma.siteConfig.upsert({
            where: { key: stateKey(key) },
            create: {
              key: stateKey(key),
              value: encodeState({ managed: true, value: defaultValue }),
              label: 'System-managed Group Help default'
            },
            update: { value: encodeState({ managed: true, value: defaultValue }) }
          })
        );
        continue;
      }

      if (!state) {
        updates.push(
          prisma.siteConfig.upsert({
            where: { key: stateKey(key) },
            create: {
              key: stateKey(key),
              value: encodeState({ managed: currentValue === defaultValue, value: currentValue }),
              label: 'System-managed Group Help default'
            },
            update: {
              value: encodeState({ managed: currentValue === defaultValue, value: currentValue })
            }
          })
        );
        continue;
      }

      if (state.managed && currentValue === state.value && currentValue !== defaultValue) {
        updates.push(prisma.siteConfig.update({ where: { key }, data: { value: defaultValue } }));
        updates.push(
          prisma.siteConfig.update({
            where: { key: stateKey(key) },
            data: { value: encodeState({ managed: true, value: defaultValue }) }
          })
        );
      } else if (state.managed && currentValue !== state.value) {
        updates.push(
          prisma.siteConfig.update({
            where: { key: stateKey(key) },
            data: { value: encodeState({ managed: false, value: currentValue }) }
          })
        );
      }
    }

    if (updates.length) await prisma.$transaction(updates);
    lastSyncAt = Date.now();
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

/** Marks values saved from the admin panel as deliberate overrides. */
export async function markGroupHelpConfigOverrides(entries: Array<{ key: string; value: string }>) {
  const validEntries = entries.filter((entry) => entry.key in GROUP_HELP_CONFIG_DEFAULTS);
  if (!validEntries.length) return;
  await prisma.$transaction(
    validEntries.map(({ key, value }) =>
      prisma.siteConfig.upsert({
        where: { key: stateKey(key) },
        create: {
          key: stateKey(key),
          value: encodeState({ managed: false, value }),
          label: 'System-managed Group Help default'
        },
        update: { value: encodeState({ managed: false, value }) }
      })
    )
  );
  lastSyncAt = Date.now();
}
