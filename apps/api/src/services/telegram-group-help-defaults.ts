import { GROUP_HELP_CONFIG_KEYS } from '../constants/group-help-config.constants.js';
import { markSiteConfigOverrides } from './site-config.service.js';

/**
 * Records that a database value was explicitly saved by an administrator.
 * These rows are audit metadata only; they are never used to overwrite live
 * configuration at runtime.
 */
export async function markGroupHelpConfigOverrides(entries: Array<{ key: string; value: string }>) {
  const validKeys = new Set<string>(GROUP_HELP_CONFIG_KEYS);
  const validEntries = entries.filter((entry) => validKeys.has(entry.key));
  if (!validEntries.length) return;
  await markSiteConfigOverrides(validEntries);
}
