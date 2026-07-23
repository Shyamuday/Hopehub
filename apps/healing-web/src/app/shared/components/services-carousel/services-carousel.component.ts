import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getFeaturedServices } from '../../../core/data/services-data';
import { APP_CONSTANTS } from '../../../core/constants/app.constants';

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

  currentSlide = signal(0);
  isAutoPlaying = signal(true);
  private readonly autoSlideInterval = 9000;

  featuredServices = signal<CarouselService[]>(getFeaturedServices());

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
    // Component initialization
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

  formatPerMinute(currency: string): string {
    return currency === 'INR' ? '₹10/min' : '$10/min';
  }

  whatsappHref(_service: CarouselService): string {
    return APP_CONSTANTS.WHATSAPP.GROUP_URL;
  }

  bookService(service: CarouselService) {
    this.router.navigate(['/contact'], {
      queryParams: {
        service: service.id,
        serviceName: service.name,
        consultant: service.consultantName,
        consultantPhone: service.consultantPhone,
        duration: service.duration,
        price: service.price,
        source: 'carousel',
      },
    });
  }
}
