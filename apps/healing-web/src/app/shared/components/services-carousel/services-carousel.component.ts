import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getFeaturedServices } from '../../../core/data/services-data';
import { APP_CONSTANTS } from '../../../core/constants/app.constants';
import { BookingService } from '../../../core/services/booking.service';
import { PublicCommunicationConfigService } from '../../../core/services/public-communication-config.service';

export interface CarouselService {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  discount?: number;
  consultantName: string;
  consultantPhone: string;
  duration: string;
  image: string;
  featured: boolean;
  bookingUrl?: string;
  badge?: string;
}

@Component({
  selector: 'app-services-carousel',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './services-carousel.component.html',
  styleUrl: './services-carousel.component.scss',
})
export class ServicesCarouselComponent implements OnInit {
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private publicConfig = inject(PublicCommunicationConfigService);

  currentSlide = signal(0);
  isAutoPlaying = signal(true);
  private readonly autoSlideInterval = 9000;

  featuredServices = signal<CarouselService[]>(
    getFeaturedServices().map((service) => ({
      ...service,
      price: this.publicConfig.defaultSessionPriceRupees(),
      originalPrice: undefined,
      discount: undefined,
      badge: undefined,
      bookingUrl: this.offeringContactUrl(),
    })),
  );

  constructor() {
    // Auto-slide functionality with takeUntilDestroyed
    interval(this.autoSlideInterval)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.isAutoPlaying()) {
          this.nextSlide();
        }
      });
  }

  ngOnInit() {
    const offeringSlug = this.publicConfig.defaultOfferingSlug;
    if (!offeringSlug) return;
    this.bookingService.offeringQuote(offeringSlug).subscribe({
      next: ({ offering, quote }) => {
        const gross =
          quote.grossInPaise == null
            ? this.publicConfig.defaultSessionPriceRupees()
            : quote.grossInPaise / 100;
        const payable =
          quote.payableInPaise == null
            ? this.publicConfig.defaultSessionPriceRupees()
            : quote.payableInPaise / 100;
        this.featuredServices.set(
          getFeaturedServices().map((service) => ({
            ...service,
            price: payable,
            originalPrice: quote.discountInPaise > 0 ? gross : undefined,
            discount: quote.discountInPaise > 0 ? offering.discountPercent || undefined : undefined,
            badge:
              quote.discountInPaise > 0
                ? offering.discountLabel || 'First session offer'
                : undefined,
            bookingUrl: this.offeringContactUrl(),
          })),
        );
      },
      error: () => {
        this.featuredServices.set(
          getFeaturedServices().map((service) => ({
            ...service,
            price: this.publicConfig.defaultSessionPriceRupees(),
            originalPrice: undefined,
            discount: undefined,
            badge: undefined,
            bookingUrl: this.offeringContactUrl(),
          })),
        );
      },
    });
  }

  nextSlide() {
    this.currentSlide.update((current: number) => (current + 1) % this.featuredServices().length);
  }

  previousSlide() {
    this.currentSlide.update((current: number) =>
      current === 0 ? this.featuredServices().length - 1 : current - 1,
    );
  }

  goToSlide(index: number) {
    this.currentSlide.set(index);
  }

  pauseAutoPlay() {
    this.isAutoPlaying.set(false);
  }

  resumeAutoPlay() {
    this.isAutoPlaying.set(true);
  }

  formatPrice(price: number, currency: string): string {
    if (currency === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(price);
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  }

  formatSessionLabel(_currency: string): string {
    return this.publicConfig.defaultSessionLabel;
  }

  whatsappHref(_service: CarouselService): string {
    return APP_CONSTANTS.WHATSAPP.GROUP_URL;
  }

  private offeringContactUrl(): string {
    const offering = this.publicConfig.defaultOfferingSlug;
    return offering ? `/contact?offering=${encodeURIComponent(offering)}` : '/contact';
  }

  bookService(service: CarouselService) {
    const offering = this.publicConfig.defaultOfferingSlug;
    this.router.navigate(['/contact'], {
      queryParams: {
        service: service.id,
        serviceName: service.name,
        consultant: service.consultantName,
        consultantPhone: service.consultantPhone,
        duration: service.duration,
        price: service.price,
        ...(offering ? { offering } : {}),
        source: 'carousel',
      },
    });
  }
}
