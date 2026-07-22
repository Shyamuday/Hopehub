import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-announcement-banner',
  standalone: true,
  imports: [],
  templateUrl: './announcement-banner.component.html',
  styleUrl: './announcement-banner.component.scss'
})
export class AnnouncementBannerComponent {
  message = input<string>('');
  onDismiss = output<void>();

  dismissed = signal(false);

  dismiss() {
    this.dismissed.set(true);
    this.onDismiss.emit();
  }
}