import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, NAV_ITEMS } from './app-routes.constants';

function segment(path: string) {
  return path.split('/').filter(Boolean).pop() ?? '';
}

describe('admin navigation hierarchy', () => {
  it('places every admin navigation page in exactly one top menu and submenu category', () => {
    for (const item of NAV_ITEMS) {
      const itemSegment = segment(item.path);
      const groups = NAV_GROUPS.filter((group) => group.segments.includes(itemSegment));
      expect(groups, `${item.label} must appear in one top menu`).toHaveLength(1);

      const sections = groups[0].sections ?? [];
      if (sections.length) {
        expect(
          sections.filter((section) => section.segments.includes(itemSegment)),
          `${item.label} must appear in one submenu category`,
        ).toHaveLength(1);
      }
    }
  });
});
