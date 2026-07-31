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

  netPriceInPaise(offer: HopeHubOffering): number | null {
    if (offer.priceInPaise == null) return null;
    return Math.max(0, offer.priceInPaise - this.discountInPaise(offer));
  }

  formatNetPrice(offer: HopeHubOffering): string {
    const price = this.netPriceInPaise(offer);
    return price == null ? 'Custom quote' : this.formatPrice({ ...offer, priceInPaise: price });
  }

  partialAmountInPaise(offer: HopeHubOffering): number | null {
    const net = this.netPriceInPaise(offer);
    if (!offer.partialPaymentEnabled || offer.partialPaymentType === 'NONE' || !net) return null;
    if (offer.partialPaymentType === 'PERCENT' && offer.partialPaymentPercent) {
      return Math.max(100, Math.min(net, Math.round((net * offer.partialPaymentPercent) / 100)));
    }
    if (offer.partialPaymentType === 'FLAT' && offer.partialPaymentFlatInPaise) {
      return Math.max(100, Math.min(net, offer.partialPaymentFlatInPaise));
    }
    return null;
  }

  formatPartialAmount(offer: HopeHubOffering): string {
    const amount = this.partialAmountInPaise(offer);
    return amount == null ? '' : this.formatPrice({ ...offer, priceInPaise: amount });
  }

  mediaLinks(offer: HopeHubOffering): Array<{ label: string; url: string; kind: string }> {
    const metadata = offer.metadata || {};
    return [
      { label: 'Open Telegram group', url: metadata.telegramGroupUrl, kind: 'Telegram' },
      { label: 'Listen on Telegram', url: metadata.telegramAudioUrl, kind: 'Audio' },
      { label: 'Watch on Telegram', url: metadata.telegramVideoUrl, kind: 'Video' },
      { label: 'Listen to recording', url: metadata.recordedAudioUrl, kind: 'Audio' },
      { label: 'Watch recording', url: metadata.recordedVideoUrl, kind: 'Video' },
      { label: 'Watch on YouTube', url: metadata.youtubeUrl, kind: 'YouTube' },
    ]
      .filter((link): link is { label: string; url: string; kind: string } => Boolean(link.url))
      .map((link) => ({ ...link, url: link.url.trim() }));
  }

  hasMediaLinks(offer: HopeHubOffering): boolean {
    return this.mediaLinks(offer).length > 0;
  }

  bookingQuery(offer: HopeHubOffering, paymentMode: 'FULL' | 'PARTIAL' = 'FULL') {
    return {
      offering: offer.slug,
      offeringId: offer.id,
      paymentMode,
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
