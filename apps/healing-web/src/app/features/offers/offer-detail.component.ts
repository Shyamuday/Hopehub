import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BookingService, HopeHubOffering } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { environment } from '../../../environments/environment';

type MediaLink = {
  label: string;
  url: string;
  kind: string;
  source: 'telegram' | 'audio' | 'video' | 'youtube';
};

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
  private readonly sanitizer = inject(DomSanitizer);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly authModal = inject(AuthModalService);

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

  mediaLinks(offer: HopeHubOffering): MediaLink[] {
    const metadata = offer.metadata || {};
    return [
      {
        label: 'Open Telegram group',
        url: metadata.telegramGroupUrl,
        kind: 'Telegram',
        source: 'telegram',
      },
      {
        label: 'Listen on Telegram',
        url: metadata.telegramAudioUrl,
        kind: 'Audio',
        source: 'telegram',
      },
      {
        label: 'Watch on Telegram',
        url: metadata.telegramVideoUrl,
        kind: 'Video',
        source: 'telegram',
      },
      {
        label: 'Listen to recording',
        url: metadata.recordedAudioUrl,
        kind: 'Audio',
        source: 'audio',
      },
      { label: 'Watch recording', url: metadata.recordedVideoUrl, kind: 'Video', source: 'video' },
      { label: 'Watch on YouTube', url: metadata.youtubeUrl, kind: 'YouTube', source: 'youtube' },
    ]
      .filter((link): link is MediaLink => Boolean(link.url))
      .map((link) => ({ ...link, url: this.absoluteMediaUrl(link.url.trim()) }));
  }

  hasMediaLinks(offer: HopeHubOffering): boolean {
    return this.mediaLinks(offer).length > 0;
  }

  canAccessMedia(offer: HopeHubOffering): boolean {
    const mode = offer.metadata?.mediaAccessMode || 'PUBLIC';
    if (mode === 'PUBLIC') return true;
    if (mode === 'LOGIN_REQUIRED') return Boolean(this.auth.getToken());
    if (mode === 'PAID_ONLY') return false;
    return true;
  }

  mediaAccessMessage(offer: HopeHubOffering): string {
    const mode = offer.metadata?.mediaAccessMode || 'PUBLIC';
    if (mode === 'LOGIN_REQUIRED') return 'Sign in to access this recorded session.';
    if (mode === 'PAID_ONLY')
      return 'This recording is available after purchase or admin approval.';
    return '';
  }

  openLogin(): void {
    this.authModal.openLogin();
  }

  audioSources(offer: HopeHubOffering): string[] {
    return this.mediaLinks(offer)
      .filter((link) => link.source === 'audio')
      .map((link) => link.url);
  }

  videoSources(offer: HopeHubOffering): string[] {
    return this.mediaLinks(offer)
      .filter((link) => link.source === 'video')
      .map((link) => link.url);
  }

  youtubeEmbedUrl(offer: HopeHubOffering): SafeResourceUrl | null {
    const youtube = this.mediaLinks(offer).find((link) => link.source === 'youtube');
    const videoId = youtube ? this.youtubeVideoId(youtube.url) : '';
    return videoId
      ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`)
      : null;
  }

  trackMediaClick(offer: HopeHubOffering, link: MediaLink): void {
    if (!this.auth.getToken()) return;
    this.http
      .post(`${environment.apiUrl}/analytics/events`, {
        name: 'hope_hub_recorded_media_click',
        category: 'ENGAGEMENT',
        properties: {
          offeringId: offer.id,
          offeringSlug: offer.slug,
          offeringTitle: offer.title,
          mediaSource: link.source,
          mediaKind: link.kind,
          mediaLabel: link.label,
        },
      })
      .subscribe({ error: () => undefined });
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

  private absoluteMediaUrl(url: string): string {
    if (!url || /^https?:\/\//i.test(url)) return url;
    return `${environment.apiUrl}${url.startsWith('/') ? url : `/${url}`}`;
  }

  private youtubeVideoId(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '');
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2] || '';
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || '';
      return parsed.searchParams.get('v') || '';
    } catch {
      return '';
    }
  }
}
