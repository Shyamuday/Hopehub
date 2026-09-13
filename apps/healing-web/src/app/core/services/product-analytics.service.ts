import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GoogleAdsService } from './google-ads.service';

export const HOPE_HUB_ANALYTICS_EVENTS = {
  SERVICE_VIEWED: 'hope_hub.service_viewed',
  OFFER_VIEWED: 'hope_hub.offer_viewed',
  BOOKING_FORM_OPENED: 'hope_hub.booking_form_opened',
  SUPPORT_SELECTED: 'hope_hub.support_selected',
  BOOKING_STEP_VIEWED: 'hope_hub.booking_step_viewed',
  SLOT_SELECTED: 'hope_hub.slot_selected',
  LOGIN_REQUIRED: 'hope_hub.login_required',
  PAYMENT_STARTED: 'hope_hub.payment_started',
  PAYMENT_SUCCESS: 'hope_hub.payment_success',
  PAYMENT_FAILED: 'hope_hub.payment_failed',
  LIVE_SESSION_OPENED: 'hope_hub.live_session_opened',
  FOLLOW_UP_REQUESTED: 'hope_hub.follow_up_requested',
  CONTENT_LOCKED_VIEWED: 'hope_hub.content_locked_viewed',
  CONTENT_UNLOCKED_CLICKED: 'hope_hub.content_unlocked_clicked',
  TELEGRAM_OUTBOUND_CLICKED: 'hope_hub.telegram_outbound_clicked',
  REGISTRATION_COMPLETED: 'hope_hub.registration_completed',
} as const;

@Injectable({ providedIn: 'root' })
export class ProductAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly googleAds = inject(GoogleAdsService);

  track(
    name: string,
    properties: Record<string, unknown> = {},
    category: 'FUNNEL' | 'ENGAGEMENT' | 'SYSTEM' = 'FUNNEL',
  ): void {
    this.trackGoogleAdsConversion(name, properties);
    this.http
      .post(`${this.apiUrl}/analytics/events`, {
        name,
        category,
        sessionId: this.sessionId(),
        properties,
      })
      .subscribe({ error: () => undefined });
  }

  private trackGoogleAdsConversion(name: string, properties: Record<string, unknown>): void {
    if (name === HOPE_HUB_ANALYTICS_EVENTS.TELEGRAM_OUTBOUND_CLICKED) {
      this.googleAds.trackConversion('telegram');
      return;
    }
    if (name === HOPE_HUB_ANALYTICS_EVENTS.BOOKING_FORM_OPENED) {
      this.googleAds.trackConversion('bookingStarted');
      return;
    }
    if (name === HOPE_HUB_ANALYTICS_EVENTS.LIVE_SESSION_OPENED) {
      this.googleAds.trackConversion('liveSupport');
      return;
    }
    if (name === HOPE_HUB_ANALYTICS_EVENTS.REGISTRATION_COMPLETED) {
      this.googleAds.trackConversion('registration');
      return;
    }
    if (name !== HOPE_HUB_ANALYTICS_EVENTS.PAYMENT_SUCCESS) return;

    const payableInPaise = Number(properties['payableInPaise']);
    const consultationId = String(properties['consultationId'] || '').trim();
    this.googleAds.trackConversion('paymentSuccess', {
      value: Number.isFinite(payableInPaise) ? payableInPaise / 100 : undefined,
      currency: 'INR',
      transactionId: consultationId || undefined,
    });
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
