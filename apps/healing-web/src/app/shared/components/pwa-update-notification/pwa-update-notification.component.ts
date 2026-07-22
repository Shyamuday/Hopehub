import { Component, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PWAService, PWAUpdateNotification } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-update-notification',
  standalone: true,
  imports: [],
  templateUrl: './pwa-update-notification.component.html',
  styleUrl: './pwa-update-notification.component.scss'
})
export class PWAUpdateNotificationComponent implements OnInit {
  updateNotification = signal<PWAUpdateNotification | null>(null);

  constructor(private pwaService: PWAService) {
    this.pwaService.updateNotification$
      .pipe(takeUntilDestroyed())
      .subscribe((notification: PWAUpdateNotification | null) => {
        this.updateNotification.set(notification);
      });
  }

  ngOnInit(): void {
    // Component initialization if needed
  }

  async update(): Promise<void> {
    if (this.updateNotification()) {
      await this.updateNotification()!.update();
    }
  }

  dismiss(): void {
    if (this.updateNotification()) {
      this.updateNotification()!.dismiss();
    }
  }
}