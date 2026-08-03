import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingService, HopeHubBanner } from '../../../core/services/booking.service';

@Component({
  selector: 'app-offer-banner-carousel',
  standalone: true,
  templateUrl: './offer-banner-carousel.component.html',
  styleUrl: './offer-banner-carousel.component.scss',
})
export class OfferBannerCarouselComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly router = inject(Router);

  readonly banners = signal<HopeHubBanner[]>([]);
  readonly current = signal(0);
  readonly loading = signal(true);

  constructor() {
    interval(8000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.next());
  }

  ngOnInit(): void {
    this.bookingService.cachedBanners().subscribe({
      next: ({ banners }) => {
        this.banners.set(banners);
        this.loading.set(false);
      },
      error: () => {
        this.banners.set([]);
        this.loading.set(false);
      },
    });
  }

  activeBanner(): HopeHubBanner | null {
    return this.banners()[this.current()] ?? null;
  }

  next(): void {
    const items = this.banners();
    if (items.length <= 1) return;
    this.current.update((index) => (index + 1) % items.length);
  }

  go(index: number): void {
    this.current.set(index);
  }

  open(banner: HopeHubBanner): void {
    void this.router.navigateByUrl(banner.routePath || '/packages');
  }
}
