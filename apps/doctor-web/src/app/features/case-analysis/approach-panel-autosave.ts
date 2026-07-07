import { DestroyRef, effect, inject } from '@angular/core';
import { createDebouncedSaver } from './case-analysis-autosave.util';

export type ApproachPanelAutoSaveControl = {
  resetSnapshot(value: unknown): void;
};

export function installApproachPanelAutoSave<T>(
  model: () => T,
  save: (value: T) => void,
  hydrating: () => boolean,
  delayMs = 1200
): ApproachPanelAutoSaveControl {
  const destroyRef = inject(DestroyRef);
  const saver = createDebouncedSaver(delayMs);
  let lastSnapshot = '';

  destroyRef.onDestroy(() => saver.cancel());

  effect(() => {
    const value = model();
    if (hydrating()) return;

    const snapshot = JSON.stringify(value);
    if (!lastSnapshot) {
      lastSnapshot = snapshot;
      return;
    }
    if (snapshot === lastSnapshot) return;

    saver.schedule(() => {
      lastSnapshot = snapshot;
      save(value);
    });
  });

  return {
    resetSnapshot(value: unknown) {
      saver.cancel();
      lastSnapshot = JSON.stringify(value);
    }
  };
}
