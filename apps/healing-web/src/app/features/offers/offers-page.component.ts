import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingService, HopeHubOffering } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';

type OfferMode = 'packages' | 'events' | 'resources';

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
  private readonly notificationService = inject(NotificationService);

  readonly mode = signal<OfferMode>('packages');
  readonly offerings = signal<HopeHubOffering[]>([]);
  readonly loading = signal(true);

  readonly title = computed(() =>
    this.mode() === 'events'
      ? 'Workshops, meetups and group care'
      : this.mode() === 'resources'
        ? 'Recorded sessions and community media'
        : 'Choose a care package',
  );
  readonly subtitle = computed(() =>
    this.mode() === 'events'
      ? 'Join fixed-date group sessions, workshops, webinars, and community meetups.'
      : this.mode() === 'resources'
        ? 'Watch or listen to selected Telegram group recordings, uploaded sessions, and YouTube sessions.'
        : 'Choose what feels right for you.',
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
    if (offer.type === 'RECORDED_SESSION') return `/resources/${offer.slug}`;
    if (offer.type === 'ORGANISATION_PROGRAM') return '/organization';
    return `/packages/${offer.slug}`;
  }

  mediaLinkCount(offer: HopeHubOffering): number {
    const metadata = offer.metadata || {};
    return [
      metadata.telegramGroupUrl,
      metadata.telegramAudioUrl,
      metadata.telegramVideoUrl,
      metadata.recordedAudioUrl,
      metadata.recordedVideoUrl,
      metadata.youtubeUrl,
    ].filter(Boolean).length;
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

  effectivePriceInPaise(offer: HopeHubOffering): number | null {
    if (offer.priceInPaise == null) return null;
    return Math.max(0, offer.priceInPaise - this.discountInPaise(offer));
  }

  formatEffectivePrice(offer: HopeHubOffering): string {
    const price = this.effectivePriceInPaise(offer);
    return price == null ? 'Custom quote' : this.formatPrice({ ...offer, priceInPaise: price });
  }

  discountInPaise(offer: HopeHubOffering): number {
    if (!offer.isDiscountActive || offer.discountType === 'NONE' || !offer.priceInPaise) return 0;
    let amount = 0;
    if (['PERCENT', 'REFERRAL', 'CUSTOM'].includes(offer.discountType) && offer.discountPercent) {
      amount = Math.round((offer.priceInPaise * offer.discountPercent) / 100);
    }
    if (['FLAT', 'REFERRAL', 'CUSTOM'].includes(offer.discountType) && offer.discountFlatInPaise) {
      amount = Math.max(amount, offer.discountFlatInPaise);
    }
    if (offer.discountMaxInPaise) amount = Math.min(amount, offer.discountMaxInPaise);
    return Math.max(0, Math.min(amount, offer.priceInPaise - 100));
  }

  private load(): void {
    this.loading.set(true);
    const types =
      this.mode() === 'events'
        ? ['WORKSHOP', 'MEETUP', 'WEBINAR', 'GROUP_SESSION']
        : this.mode() === 'resources'
          ? ['RECORDED_SESSION']
          : ['INDIVIDUAL_SESSION', 'CARE_PACKAGE', 'ORGANISATION_PROGRAM'];
    this.bookingService.offeringsPageData({ types }).subscribe({
      next: ({ offerings }) => {
        this.offerings.set(offerings);
        this.loading.set(false);
      },
      error: () => {
        this.offerings.set([]);
        this.notificationService.error('Could not load offers right now.');
        this.loading.set(false);
      },
    });
  }
}
