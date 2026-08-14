import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CallPushNotificationService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush);
  private readonly router = inject(Router);
  private clickListenerBound = false;

  init(): void {
    if (this.swPush.isEnabled) this.bindNotificationClicks();
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
