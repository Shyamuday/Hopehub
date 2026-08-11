import { Injectable } from '@angular/core';

export type ConsumerFlowPreferenceMode = 'chat' | 'voice' | 'video';

export type ConsumerFlowPreferences = {
  concern?: string;
  mode?: ConsumerFlowPreferenceMode;
  serviceName?: string;
  providerId?: string;
  assessmentId?: string;
  updatedAt?: string;
};

@Injectable({ providedIn: 'root' })
export class ConsumerFlowPreferencesService {
  private readonly storageKey = 'hopehub_consumer_flow_preferences';

  read(): ConsumerFlowPreferences {
    if (typeof localStorage === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}') as ConsumerFlowPreferences;
    } catch {
      return {};
    }
  }

  update(next: ConsumerFlowPreferences): void {
    if (typeof localStorage === 'undefined') return;
    const merged = {
      ...this.read(),
      ...Object.fromEntries(
        Object.entries(next).filter(
          ([, value]) => value !== undefined && value !== null && value !== '',
        ),
      ),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(merged));
  }
}
