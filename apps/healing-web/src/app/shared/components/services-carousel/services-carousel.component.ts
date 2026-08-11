import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APP_CONSTANTS } from '../../../core/constants/app.constants';
import { CONSUMER_UX_COPY } from '../../../core/constants/consumer-ux-copy.constants';
import { BookingService, HopeHubService } from '../../../core/services/booking.service';
import { PublicCommunicationConfigService } from '../../../core/services/public-communication-config.service';
import { AppButtonComponent } from '../app-button/app-button.component';
import { PageHeaderComponent } from '../page-header/page-header.component';

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
  imports: [RouterModule, AppButtonComponent, PageHeaderComponent],
  templateUrl: './services-carousel.component.html',
  styleUrl: './services-carousel.component.scss',
})
export class ServicesCarouselComponent implements OnInit {
  readonly UX = CONSUMER_UX_COPY;
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private publicConfig = inject(PublicCommunicationConfigService);

  currentSlide = signal(0);
  isAutoPlaying = signal(true);
  private readonly autoSlideInterval = 9000;

  featuredServices = signal<CarouselService[]>([]);

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
    this.bookingService.servicesPageData().subscribe({
      next: ({ services, singleSessionQuote }) => {
        this.featuredServices.set(
          services
            .filter((service) => service.featured)
            .map((service) => this.toCarouselService(service, singleSessionQuote)),
        );
      },
      error: () => this.featuredServices.set([]),
    });
  }

  nextSlide() {
    const count = this.featuredServices().length;
    if (!count) return;
    this.currentSlide.update((current: number) => (current + 1) % count);
  }

  previousSlide() {
    const count = this.featuredServices().length;
    if (!count) return;
    this.currentSlide.update((current: number) => (current === 0 ? count - 1 : current - 1));
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
    return '';
  }

  whatsappHref(_service: CarouselService): string {
    return APP_CONSTANTS.WHATSAPP.GROUP_URL;
  }

  private toCarouselService(
    service: HopeHubService,
    sessionQuote: {
      offering: { discountPercent?: number | null; discountLabel?: string | null };
      quote: {
        grossInPaise?: number | null;
        payableInPaise?: number | null;
        discountInPaise?: number | null;
      };
    } | null,
  ): CarouselService {
    const quote = sessionQuote?.quote;
    const hasDiscount = Boolean(quote?.discountInPaise && quote.discountInPaise > 0);
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      price:
        quote?.payableInPaise != null
          ? quote.payableInPaise / 100
          : (service.pricing?.individual ?? 0),
      originalPrice:
        hasDiscount && quote?.grossInPaise != null ? quote.grossInPaise / 100 : undefined,
      currency: service.pricing?.currency ?? '',
      discount: hasDiscount ? (sessionQuote?.offering.discountPercent ?? undefined) : undefined,
      consultantName: '',
      consultantPhone: '',
      duration: service.duration ?? '',
      image: service.imageUrl ?? '',
      featured: service.featured,
      badge: hasDiscount ? (sessionQuote?.offering.discountLabel ?? undefined) : undefined,
      bookingUrl: this.offeringContactUrl(),
    };
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
