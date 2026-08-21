import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AUTH_TOKEN_KEY } from '../constants/auth.constants';
import { environment } from '../../../environments/environment';
import { ConsultationNavigationService } from './consultation-navigation.service';
import type { BackgroundCallAlertReadiness } from '@hopehub/platform-ui';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly router = inject(Router);
  private readonly consultationNav = inject(ConsultationNavigationService);

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      await this.registerBrowserWorker();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        await this.enableBrowserCalls();
      }
      return;
    }

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    await PushNotifications.addListener('registration', (token) => {
      this.sendTokenToServer(token.value);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      this.handleNotificationTap(action.notification.data as Record<string, string>);
    });
  }

  async enableBrowserCalls(): Promise<boolean> {
    if (
      Capacitor.isNativePlatform() ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return false;
    }
    const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!authToken) return false;

    try {
      const registration = await this.registerBrowserWorker();
      if (!registration) return false;
      const permission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      if (permission !== 'granted') return false;

      const configResponse = await fetch(`${environment.apiUrl}/doctor/web-push-config`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!configResponse.ok) return false;
      const config = (await configResponse.json()) as { enabled?: boolean; publicKey?: string };
      if (!config.enabled || !config.publicKey) return false;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(config.publicKey),
        }));
      const saveResponse = await fetch(`${environment.apiUrl}/doctor/web-push-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(subscription.toJSON()),
      });
      return saveResponse.ok;
    } catch {
      return false;
    }
  }

  async enableCalls(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return this.enableBrowserCalls();
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') return false;
    await PushNotifications.register();
    return true;
  }

  async callAlertReadiness(): Promise<BackgroundCallAlertReadiness> {
    if (Capacitor.isNativePlatform()) {
      const permission = await PushNotifications.checkPermissions();
      const enabled = permission.receive === 'granted';
      return {
        supported: true,
        enabled,
        installed: true,
        native: true,
        permission: enabled ? 'granted' : permission.receive === 'denied' ? 'denied' : 'default',
        canEnable: permission.receive !== 'denied',
        message: enabled
          ? 'Native background call notifications are ready.'
          : permission.receive === 'denied'
            ? 'Call notifications are blocked. Allow them in your phone settings.'
            : 'Turn on notifications so calls ring while the app is in the background.',
      };
    }

    const installed = this.isBrowserInstalled();
    const supported =
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      typeof window !== 'undefined' &&
      'PushManager' in window &&
      typeof Notification !== 'undefined';
    if (!supported) {
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
    const registration = await this.registerBrowserWorker();
    const subscription =
      permission === 'granted' ? await registration?.pushManager.getSubscription() : null;
    const enabled = Boolean(subscription);
    return {
      supported: true,
      enabled,
      installed,
      native: false,
      permission,
      canEnable: permission !== 'denied' && !enabled,
      message: enabled
        ? installed
          ? 'Ready to ring in the background. Keep system notifications enabled.'
          : 'Background notifications are ready. Installing the app improves mobile reliability.'
        : permission === 'denied'
          ? 'Notifications are blocked. Allow them from your browser site settings.'
          : 'Turn on notifications so calls can alert you outside this page.',
    };
  }

  private isBrowserInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  private async registerBrowserWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    try {
      return await navigator.serviceWorker.register('/call-sw.js');
    } catch {
      return null;
    }
  }

  private urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
    return bytes;
  }

  private sendTokenToServer(token: string): void {
    const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!authToken) return;

    fetch(`${environment.apiUrl}/doctor/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
    }).catch(() => undefined);
  }

  private handleNotificationTap(data: Record<string, string>): void {
    const target = this.consultationNav.resolveNotificationRoute(data);
    if (!target) return;
    void this.router.navigate(target.commands, { queryParams: target.queryParams });
  }
}
