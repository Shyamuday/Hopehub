import type { CanDeactivateFn } from '@angular/router';

export type UnsavedChangesAware = {
  hasUnsavedChanges: () => boolean;
};

/** Prevents accidental in-app navigation while an editor still has browser-only changes. */
export const unsavedChangesGuard: CanDeactivateFn<UnsavedChangesAware> = (component) =>
  !component.hasUnsavedChanges() ||
  window.confirm('You have unsaved changes. Leave this page and discard them?');
