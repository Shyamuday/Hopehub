import { prisma } from '../db.js';
import { GROUP_HELP_CONFIG_KEYS } from './telegram-group-help.config.js';

const DEFAULT_STATE_PREFIX = '__system:group-help-default:';
type ManagedDefaultState = {
  managed: boolean;
  value: string;
};

function stateKey(key: string) {
  return `${DEFAULT_STATE_PREFIX}${key}`;
}

function encodeState(state: ManagedDefaultState) {
  return JSON.stringify(state);
}

/**
 * Records that a database value was explicitly saved by an administrator.
 * These rows are audit metadata only; they are never used to overwrite live
 * configuration at runtime.
 */
export async function markGroupHelpConfigOverrides(entries: Array<{ key: string; value: string }>) {
  const validKeys = new Set<string>(GROUP_HELP_CONFIG_KEYS);
  const validEntries = entries.filter((entry) => validKeys.has(entry.key));
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
}
