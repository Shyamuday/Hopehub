import { Component } from '@angular/core';
import { NotificationInboxComponent } from '@hopehub/platform-ui';
import { CROSS_APP_API_PATHS } from '@hopehub/clinic-api/cross-app-api-paths.constants';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';

@Component({
  selector: 'app-notifications-inbox-page',
  standalone: true,
  imports: [NotificationInboxComponent],
  template: `
    <section class="page">
      <header class="hero">
        <h2>Notification inbox</h2>
        <p class="muted">Alerts and updates for your provider account.</p>
      </header>
      <app-notification-inbox [config]="inboxConfig" />
    </section>
  `,
  styles: `
    .page {
      padding: 1rem 1.25rem 2rem;
    }
    .hero {
      margin-bottom: 1rem;
    }
    .hero h2 {
      margin: 0 0 0.35rem;
    }
    .muted {
      color: #64748b;
      margin: 0;
    }
  `,
})
export class NotificationsInboxPage {
  readonly inboxConfig = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: CROSS_APP_API_PATHS.NOTIFICATIONS,
  };
}
