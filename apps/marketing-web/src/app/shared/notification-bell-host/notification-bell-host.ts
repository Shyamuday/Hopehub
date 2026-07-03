import { Component, ChangeDetectionStrategy } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-notification-bell-host',
  standalone: true,
  imports: [NotificationBellComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<app-shared-notification-bell [config]="config" />`
})
export class NotificationBellHost {
  readonly config = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications'
  };
}
