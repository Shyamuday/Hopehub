import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import type { BackgroundCallAlertReadiness } from '@hopehub/platform-ui';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CallPushNotificationService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush);
  private readonly router = inject(Router);
  private clickListenerBound = false;

  init(): void {
    if (!this.swPush.isEnabled) return;
    this.bindNotificationClicks();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      void this.enable();
    }
  }

  async enable(): Promise<boolean> {
    if (!this.swPush.isEnabled) return false;
    try {
      const config = await firstValueFrom(
        this.http.get<{ enabled: boolean; publicKey: string }>(
          `${environment.apiUrl}/patient/web-push-config`,
        ),
      );
      if (!config.enabled || !config.publicKey) return false;
      const existing = await firstValueFrom(this.swPush.subscription);
      const subscription =
        existing || (await this.swPush.requestSubscription({ serverPublicKey: config.publicKey }));
      if (!subscription) return false;
      await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/patient/web-push-subscription`,
          subscription.toJSON(),
        ),
      );
      this.bindNotificationClicks();
      return true;
    } catch {
      return false;
    }
  }

  async readiness(): Promise<BackgroundCallAlertReadiness> {
    const installed = this.isInstalled();
    const isIos =
      typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent || '');
    if (!this.swPush.isEnabled || typeof Notification === 'undefined') {
      return {
        supported: false,
        enabled: false,
        installed,
        native: false,
        permission: 'unsupported',
        canEnable: false,
        message: 'Background alerts are unavailable in this browser. Keep Hope Hub open for calls.',
      };
    }

    const permission = Notification.permission;
    const subscription =
      permission === 'granted' ? await firstValueFrom(this.swPush.subscription) : null;
    const enabled = Boolean(subscription);
    if (enabled) {
      return {
        supported: true,
        enabled: true,
        installed,
        native: false,
        permission,
        canEnable: false,
        message: installed
          ? 'Ready to ring in the background. Keep system notifications enabled.'
          : 'Background notifications are ready. Installing Hope Hub improves mobile reliability.',
      };
    }
    if (permission === 'denied') {
      return {
        supported: true,
        enabled: false,
        installed,
        native: false,
        permission,
        canEnable: false,
        message: 'Notifications are blocked. Allow them from your browser site settings.',
      };
    }
    if (isIos && !installed) {
      return {
        supported: true,
        enabled: false,
        installed: false,
        native: false,
        permission,
        canEnable: false,
        message: 'On iPhone, add Hope Hub to the Home Screen first, then enable call alerts.',
      };
    }
    return {
      supported: true,
      enabled: false,
      installed,
      native: false,
      permission,
      canEnable: true,
      message: 'Turn on notifications so incoming calls can alert you outside this page.',
    };
  }

  private isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  private bindNotificationClicks() {
    if (this.clickListenerBound) return;
    this.clickListenerBound = true;
    this.swPush.notificationClicks.subscribe(({ notification }) => {
      const data = (notification.data || {}) as Record<string, string>;
      const route = data['route'];
      if (route) void this.router.navigateByUrl(route);
    });
  }
}
