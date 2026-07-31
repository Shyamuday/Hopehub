import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingService, HopeHubOffering } from '../../core/services/booking.service';

@Component({
  selector: 'app-offer-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './offer-detail.component.html',
  styleUrl: './offer-detail.component.scss',
})
export class OfferDetailComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly route = inject(ActivatedRoute);

  readonly offer = signal<HopeHubOffering | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug') || '';
      this.load(slug);
    });
  }

  formatPrice(offer: HopeHubOffering): string {
    if (offer.priceInPaise == null) return 'Custom quote';
    if (offer.priceInPaise === 0) return 'Free';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: offer.currency || 'INR',
      maximumFractionDigits: 0,
    }).format(offer.priceInPaise / 100);
  }

  bookingQuery(offer: HopeHubOffering) {
    return {
      offering: offer.slug,
      offeringId: offer.id,
      serviceName: offer.title,
      duration: offer.sessionDurationMinutes ? `${offer.sessionDurationMinutes} min` : '',
      price: offer.priceInPaise == null ? '' : offer.priceInPaise / 100,
      source: offer.type.toLowerCase(),
    };
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.bookingService.offering(slug).subscribe({
      next: ({ offering }) => {
        this.offer.set(offering);
        this.loading.set(false);
      },
      error: () => {
        this.offer.set(null);
        this.loading.set(false);
      },
    });
  }
}
