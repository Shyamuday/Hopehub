import { Injectable } from '@angular/core';

const PROVIDER_DRAFT_KEY_PREFIX = 'hopehub_provider_onboarding_draft:';

export type ProviderOnboardingDraft<TModel = Record<string, unknown>, TService = unknown> = {
  step: string;
  model: TModel;
  services: TService[];
  savedAt: string;
};

@Injectable({ providedIn: 'root' })
export class ProviderOnboardingDraftService {
  load<TModel, TService>(email: string): ProviderOnboardingDraft<TModel, TService> | null {
    if (!this.storageAvailable() || !email.trim()) return null;
    try {
      const raw = localStorage.getItem(this.key(email));
      return raw ? (JSON.parse(raw) as ProviderOnboardingDraft<TModel, TService>) : null;
    } catch {
      this.clear(email);
      return null;
    }
  }

  save<TModel, TService>(
    email: string,
    value: Omit<ProviderOnboardingDraft<TModel, TService>, 'savedAt'>,
  ): void {
    if (!this.storageAvailable() || !email.trim()) return;
    localStorage.setItem(
      this.key(email),
      JSON.stringify({ ...value, savedAt: new Date().toISOString() }),
    );
  }

  clear(email: string): void {
    if (!this.storageAvailable() || !email.trim()) return;
    localStorage.removeItem(this.key(email));
  }

  clearAll(): void {
    if (!this.storageAvailable()) return;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(PROVIDER_DRAFT_KEY_PREFIX)) localStorage.removeItem(key);
    }
  }

  private key(email: string): string {
    return `${PROVIDER_DRAFT_KEY_PREFIX}${encodeURIComponent(email.trim().toLowerCase())}`;
  }

  private storageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
