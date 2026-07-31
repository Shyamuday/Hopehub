import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingService, HopeHubOffering } from '../../core/services/booking.service';

type OfferMode = 'packages' | 'events';

@Component({
  selector: 'app-offers-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './offers-page.component.html',
  styleUrl: './offers-page.component.scss',
})
export class OffersPageComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<OfferMode>('packages');
  readonly offerings = signal<HopeHubOffering[]>([]);
  readonly loading = signal(true);

  readonly title = computed(() =>
    this.mode() === 'events' ? 'Workshops, meetups and group care' : 'Choose a care package',
  );
  readonly subtitle = computed(() =>
    this.mode() === 'events'
      ? 'Join fixed-date group sessions, workshops, webinars, and community meetups.'
      : 'Pick a single session or a care package. Admin can update these prices anytime.',
  );

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.mode.set((data['mode'] as OfferMode) || 'packages');
      this.load();
    });
  }

  offerLink(offer: HopeHubOffering): string {
    if (
      offer.type === 'WORKSHOP' ||
      offer.type === 'MEETUP' ||
      offer.type === 'WEBINAR' ||
      offer.type === 'GROUP_SESSION'
    ) {
      return `/events/${offer.slug}`;
    }
    if (offer.type === 'ORGANISATION_PROGRAM') return '/organization';
    return `/packages/${offer.slug}`;
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

  private load(): void {
    this.loading.set(true);
    const types =
      this.mode() === 'events'
        ? ['WORKSHOP', 'MEETUP', 'WEBINAR', 'GROUP_SESSION']
        : ['INDIVIDUAL_SESSION', 'CARE_PACKAGE', 'ORGANISATION_PROGRAM'];
    this.bookingService.offerings().subscribe({
      next: ({ offerings }) => {
        this.offerings.set(offerings.filter((offer) => types.includes(offer.type)));
        this.loading.set(false);
      },
      error: () => {
        this.offerings.set([]);
        this.loading.set(false);
      },
    });
  }
}
