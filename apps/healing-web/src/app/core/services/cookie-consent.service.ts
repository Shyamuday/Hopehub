import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, computed, signal } from '@angular/core';

export type CookieConsentChoice = 'unknown' | 'essential' | 'all';

const STORAGE_KEY = 'hopehub:cookie-consent:v1';

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  private readonly choiceState = signal<CookieConsentChoice>('unknown');
  private readonly settingsOpenState = signal(false);

  readonly choice = this.choiceState.asReadonly();
  readonly hasAdvertisingConsent = computed(() => this.choiceState() === 'all');
  readonly showBanner = computed(
    () => this.choiceState() === 'unknown' || this.settingsOpenState(),
  );

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    if (!isPlatformBrowser(this.platformId)) return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'essential' || stored === 'all') {
      this.choiceState.set(stored);
    }
  }

  acceptAll(): void {
    this.save('all');
  }

  rejectOptional(): void {
    this.save('essential');
  }

  openSettings(): void {
    this.settingsOpenState.set(true);
  }

  closeSettings(): void {
    this.settingsOpenState.set(false);
  }

  private save(choice: Exclude<CookieConsentChoice, 'unknown'>): void {
    this.choiceState.set(choice);
    this.settingsOpenState.set(false);
    if (isPlatformBrowser(this.platformId)) {
      window.localStorage.setItem(STORAGE_KEY, choice);
    }
  }
}
