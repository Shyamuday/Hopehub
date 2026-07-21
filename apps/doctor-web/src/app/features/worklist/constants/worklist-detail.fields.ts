import type { DetailFieldDef } from '@hopehub/platform-ui';
import type { WorklistItem } from '../worklist-api.service';

export function worklistItemMetaFields(
  formatCreatedAt: (iso: string) => string | null
): DetailFieldDef<WorklistItem>[] {
  return [
    {
      label: '',
      getValue: (item) =>
        `Status: ${item.status} · Created ${formatCreatedAt(item.createdAt) ?? item.createdAt}`
    }
  ];
}
