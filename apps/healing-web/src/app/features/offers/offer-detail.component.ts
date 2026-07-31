import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BookingService, HopeHubOffering } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { PaymentService } from '../../core/services/payment.service';
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
  private readonly paymentService = inject(PaymentService);

  readonly offer = signal<HopeHubOffering | null>(null);
  readonly loading = signal(true);
  readonly checkoutState = signal<'IDLE' | 'CREATING' | 'OPENING' | 'VERIFYING' | 'SUCCESS'>(
    'IDLE',
  );
  readonly checkoutError = signal('');

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

  isEventOffer(offer: HopeHubOffering): boolean {
    return ['WORKSHOP', 'MEETUP', 'WEBINAR', 'GROUP_SESSION'].includes(offer.type);
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

  async payEvent(offer: HopeHubOffering, paymentMode: 'FULL' | 'PARTIAL' = 'FULL'): Promise<void> {
    if (!this.auth.getToken()) {
      this.checkoutError.set('Sign in or create an account to continue to secure payment.');
      this.authModal.openRegister();
      return;
    }

    this.checkoutError.set('');
    this.checkoutState.set('CREATING');
    try {
      const response = await firstValueFrom(
        this.bookingService.createBooking({
          serviceName: offer.title,
          servicePriceInPaise: offer.priceInPaise || undefined,
          offeringId: offer.id,
          offeringSlug: offer.slug,
          paymentMode,
          message: `${offer.type.replace('_', ' ')} registration`,
          appointmentDate: this.eventDateValue(offer),
          appointmentTime: this.eventTimeValue(offer),
          sessionDuration: offer.sessionDurationMinutes
            ? `${offer.sessionDurationMinutes} min`
            : '',
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
        }),
      );

      await this.paymentService.payConsultation(response.consultation, {
        onOrderCreated: () => this.checkoutState.set('OPENING'),
        onCheckoutOpened: () => this.checkoutState.set('OPENING'),
        onVerifying: () => this.checkoutState.set('VERIFYING'),
      });
      this.checkoutState.set('SUCCESS');
    } catch (error: any) {
      this.checkoutState.set('IDLE');
      this.checkoutError.set(
        error?.error?.message || error?.message || 'Could not start event checkout.',
      );
    }
  }

  checkoutLabel(defaultLabel: string): string {
    const state = this.checkoutState();
    if (state === 'CREATING') return 'Preparing checkout...';
    if (state === 'OPENING') return 'Opening checkout...';
    if (state === 'VERIFYING') return 'Verifying payment...';
    if (state === 'SUCCESS') return 'Payment verified';
    return defaultLabel;
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

  private eventDateValue(offer: HopeHubOffering): string {
    if (!offer.eventStartsAt) return new Date().toISOString().slice(0, 10);
    return new Date(offer.eventStartsAt).toISOString().slice(0, 10);
  }

  private eventTimeValue(offer: HopeHubOffering): string {
    if (!offer.eventStartsAt) return 'Event registration';
    return new Date(offer.eventStartsAt).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
