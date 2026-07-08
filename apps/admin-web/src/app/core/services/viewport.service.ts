import { DestroyRef, Injectable, inject, signal } from '@angular/core';

const MOBILE_QUERY = '(max-width: 768px)';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly media = typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY) : null;

  readonly isMobile = signal(this.media?.matches ?? false);

  constructor() {
    if (!this.media) return;

    const sync = () => this.isMobile.set(this.media!.matches);
    this.media.addEventListener('change', sync);
    this.destroyRef.onDestroy(() => this.media!.removeEventListener('change', sync));
  }
}
