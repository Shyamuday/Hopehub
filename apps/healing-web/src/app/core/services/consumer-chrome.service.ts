import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { consumerChromeForUrl } from './consumer-chrome.rules';

export { consumerChromeForUrl, type ConsumerChromeState } from './consumer-chrome.rules';

@Injectable({ providedIn: 'root' })
export class ConsumerChromeService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUrl = signal(this.router.url || '/');

  readonly state = computed(() => consumerChromeForUrl(this.currentUrl()));
  readonly focusMode = computed(() => this.state().focusMode);
  readonly showStandardChrome = computed(() => !this.focusMode());
  readonly showQuickActions = computed(
    () => this.showStandardChrome() && !this.state().pageOwnsMobileAction,
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }
}
