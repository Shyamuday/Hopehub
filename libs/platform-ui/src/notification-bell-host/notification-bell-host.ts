import { Component, Input } from '@angular/core';
import { NotificationBellComponent } from '@vitalis/app-notifications/notification-bell.component';
import type { NotificationBellConfig } from '@vitalis/app-notifications/types';

@Component({
  selector: 'app-notification-bell-host',
  standalone: true,
  imports: [NotificationBellComponent],
  template: `<app-shared-notification-bell [config]="config" />`
})
export class NotificationBellHostComponent {
  @Input({ required: true }) config!: NotificationBellConfig;
}
