import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AuthService } from '../../auth/auth.service';
import { ROUTE_PATHS } from '../constants/app-routes.constants';
import { environment } from '../../../environments/environment';

/**
 * Handles Capacitor push notification registration and routing.
 * Only active on native iOS/Android builds — silently skipped on web.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    let permission = await PushNotifications.checkPermissions();

    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    await PushNotifications.addListener('registration', (token) => {
      this.sendTokenToServer(token.value);
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[Push] Registration error:', err.error);
    });

    await PushNotifications.addListener('pushNotificationReceived', (_notification) => {
      // Notification arrived while app is in foreground — no-op; Socket.io handles live updates.
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      this.handleNotificationTap(action.notification.data as Record<string, string>);
    });
  }

  private sendTokenToServer(token: string): void {
    // Forward the FCM/APNs token to the API so the backend can send targeted pushes.
    const authToken = this.auth.token;
    if (!authToken) return;

    const url = `${environment.apiUrl}/patient/push-token`;
    // Fire-and-forget — if this fails the token will be re-sent on the next app open.
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
    }).catch(() => { /* silently ignore */ });
  }

  private handleNotificationTap(data: Record<string, string>): void {
    if (!this.auth.user()) return;

    if (data['consultationId']) {
      void this.router.navigate([`/patient/instant-consult/${data['consultationId']}`]);
      return;
    }

    if (data['route']) {
      void this.router.navigateByUrl(data['route']);
    }
  }
}
