import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const HOPE_HUB_ANALYTICS_EVENTS = {
  SERVICE_VIEWED: 'hope_hub.service_viewed',
  OFFER_VIEWED: 'hope_hub.offer_viewed',
  BOOKING_FORM_OPENED: 'hope_hub.booking_form_opened',
  SLOT_SELECTED: 'hope_hub.slot_selected',
  LOGIN_REQUIRED: 'hope_hub.login_required',
  PAYMENT_STARTED: 'hope_hub.payment_started',
  PAYMENT_SUCCESS: 'hope_hub.payment_success',
  PAYMENT_FAILED: 'hope_hub.payment_failed',
  FOLLOW_UP_REQUESTED: 'hope_hub.follow_up_requested',
} as const;

@Injectable({ providedIn: 'root' })
export class ProductAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  track(
    name: string,
    properties: Record<string, unknown> = {},
    category: 'FUNNEL' | 'ENGAGEMENT' | 'SYSTEM' = 'FUNNEL',
  ): void {
    this.http
      .post(`${this.apiUrl}/analytics/events`, {
        name,
        category,
        sessionId: this.sessionId(),
        properties,
      })
      .subscribe({ error: () => undefined });
  }

  private sessionId(): string {
    const key = 'hope_hub_analytics_session';
    if (typeof window === 'undefined' || !window.sessionStorage) return '';
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(key, created);
    return created;
  }
}
