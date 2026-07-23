import { Component, input, output, signal } from '@angular/core';

export type AnnouncementBannerVariant = 'highlight' | 'marquee';
export type AnnouncementBannerTone = 'teal' | 'blue' | 'emerald';

@Component({
  selector: 'app-announcement-banner',
  standalone: true,
  imports: [],
  templateUrl: './announcement-banner.component.html',
  styleUrl: './announcement-banner.component.scss',
})
export class AnnouncementBannerComponent {
  message = input<string>('');
  items = input<string[]>([]);
  actionLabel = input<string>('');
  actionHref = input<string>('');
  variant = input<AnnouncementBannerVariant>('highlight');
  tone = input<AnnouncementBannerTone>('teal');
  dismissible = input<boolean>(true);
  onDismiss = output<void>();

  dismissed = signal(false);

  bannerItems(): string[] {
    const configuredItems = this.items().filter(Boolean);
    if (configuredItems.length) {
      return [...configuredItems, ...configuredItems];
    }

    return this.message() ? [this.message(), this.message()] : [];
  }

  isExternalAction(): boolean {
    return /^https?:\/\//.test(this.actionHref());
  }

  dismiss() {
    this.dismissed.set(true);
    this.onDismiss.emit();
  }
}
