import { Component, computed, inject } from '@angular/core';
import { NotificationService, NotificationTone } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss',
})
export class NotificationCenterComponent {
  protected readonly notificationService = inject(NotificationService);
  protected readonly notifications = computed(() => this.notificationService.notifications());

  protected dismiss(id: number): void {
    this.notificationService.dismiss(id);
  }

  protected iconFor(tone: NotificationTone): string {
    switch (tone) {
      case 'success':
        return 'OK';
      case 'error':
        return '!';
      case 'warning':
        return '!';
      case 'info':
        return 'i';
    }
  }
}
