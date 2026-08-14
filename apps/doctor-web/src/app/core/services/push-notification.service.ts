import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AUTH_TOKEN_KEY } from '../constants/auth.constants';
import { environment } from '../../../environments/environment';
import { ConsultationNavigationService } from './consultation-navigation.service';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly router = inject(Router);
  private readonly consultationNav = inject(ConsultationNavigationService);

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      await this.registerBrowserWorker();
      return;
    }

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt') {
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
