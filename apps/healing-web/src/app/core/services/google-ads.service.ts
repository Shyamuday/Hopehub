import { isPlatformBrowser } from '@angular/common';
import { effect, Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { CookieConsentService } from './cookie-consent.service';

export type GoogleAdsConversion =
  'telegram' | 'bookingStarted' | 'paymentSuccess' | 'liveSupport' | 'registration';

type GoogleAdsRuntimeConfig = {
  tagId: string;
  adsenseClientId: string;
  conversions: Partial<Record<GoogleAdsConversion, string>>;
};

type GoogleTagCommand = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleTagCommand;
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleAdsService {
  private initialized = false;
  private googleTagLoaded = false;
  private adsenseLoaded = false;
  private lastPageView = '';
  private config: GoogleAdsRuntimeConfig = {
    tagId: '',
    adsenseClientId: '',
    conversions: {},
  };

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly consent: CookieConsentService,
    private readonly router: Router,
  ) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.prepareDataLayer();
    this.setConsent(false);
    effect(() => {
      const allowed = this.consent.hasAdvertisingConsent();
      this.setConsent(allowed);
      if (allowed) this.loadConfiguredTags();
    });
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.trackPageView();
        this.syncAdsenseForRoute();
      });
  }

  initialize(): void {
    this.initialized = true;
    if (isPlatformBrowser(this.platformId) && this.consent.hasAdvertisingConsent()) {
      this.loadConfiguredTags();
    }
  }

  configure(config: Partial<Record<string, string>>): void {
    this.config = {
      tagId: config['googleAdsTagId']?.trim() || '',
      adsenseClientId: config['googleAdsenseClientId']?.trim() || '',
      conversions: {
        telegram: config['googleAdsConversionTelegram']?.trim() || '',
        bookingStarted: config['googleAdsConversionBookingStarted']?.trim() || '',
        paymentSuccess: config['googleAdsConversionPaymentSuccess']?.trim() || '',
        liveSupport: config['googleAdsConversionLiveSupport']?.trim() || '',
        registration: config['googleAdsConversionRegistration']?.trim() || '',
      },
    };
    if (isPlatformBrowser(this.platformId) && this.consent.hasAdvertisingConsent()) {
      this.loadConfiguredTags();
    }
  }

  trackConversion(
    conversion: GoogleAdsConversion,
    details: { value?: number; currency?: string; transactionId?: string } = {},
  ): void {
    if (!isPlatformBrowser(this.platformId) || !this.consent.hasAdvertisingConsent()) return;

    const config = this.config;
    const label = config.conversions[conversion];
    if (!config.tagId || !label) return;

    this.loadConfiguredTags();
    const payload: Record<string, string | number> = {
      send_to: `${config.tagId}/${label}`,
    };
    if (typeof details.value === 'number' && Number.isFinite(details.value)) {
      payload['value'] = Math.max(0, details.value);
      payload['currency'] = details.currency || 'INR';
    }
    if (details.transactionId) payload['transaction_id'] = details.transactionId;

    window.gtag?.('event', 'conversion', payload);
  }

  private prepareDataLayer(): void {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function (...args: unknown[]) {
        window.dataLayer?.push(args);
      };
  }

  private setConsent(allowed: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.prepareDataLayer();
    window.gtag?.('consent', this.initialized ? 'update' : 'default', {
      ad_storage: allowed ? 'granted' : 'denied',
      ad_user_data: allowed ? 'granted' : 'denied',
      ad_personalization: 'denied',
      analytics_storage: allowed ? 'granted' : 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      wait_for_update: 500,
    });
  }

  private loadConfiguredTags(): void {
    const config = this.config;
    if (config.tagId && !this.googleTagLoaded) {
      this.googleTagLoaded = true;
      this.appendScript(
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.tagId)}`,
        'hopehub-google-tag',
      );
      window.gtag?.('js', new Date());
      window.gtag?.('config', config.tagId, {
        allow_google_signals: false,
        ads_data_redaction: true,
        send_page_view: false,
      });
      this.trackPageView();
    }

    this.applyAdsenseVerificationMeta(config.adsenseClientId);
    this.syncAdsenseForRoute();
  }

  /**
   * Auto Ads must not appear on login, booking, payment, assessment, private
   * support, call, error, or other utility screens. Until dedicated ad slots
   * exist, only complete article-detail pages are eligible.
   */
  private syncAdsenseForRoute(): void {
    const clientId = this.config.adsenseClientId;
    const eligible = this.isEditorialAdsRoute(window.location.pathname);

    if (clientId && eligible && !this.adsenseLoaded) {
      this.adsenseLoaded = true;
      this.appendScript(
        `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`,
        'hopehub-adsense',
        clientId,
      );
      return;
    }

    if (!eligible && this.adsenseLoaded) {
      document.getElementById('hopehub-adsense')?.remove();
      document
        .querySelectorAll('ins.adsbygoogle, .google-auto-placed')
        .forEach((element) => element.remove());
      this.adsenseLoaded = false;
    }
  }

  private isEditorialAdsRoute(pathname: string): boolean {
    return /^\/articles\/[^/]+\/?$/.test(pathname);
  }

  private applyAdsenseVerificationMeta(clientId: string): void {
    const selector = 'meta[name="google-adsense-account"]';
    const existing = document.head.querySelector<HTMLMetaElement>(selector);
    if (!clientId) return;

    const meta = existing || document.createElement('meta');
    meta.name = 'google-adsense-account';
    meta.content = clientId;
    if (!existing) document.head.appendChild(meta);
  }

  private appendScript(src: string, id: string, crossOriginClient = ''): void {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = src;
    if (crossOriginClient) script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }

  private trackPageView(): void {
    if (!this.googleTagLoaded || !this.consent.hasAdvertisingConsent()) return;
    const pagePath = `${window.location.pathname}${window.location.search}`;
    if (pagePath === this.lastPageView) return;
    this.lastPageView = pagePath;
    window.gtag?.('event', 'page_view', {
      page_location: window.location.href,
      page_path: pagePath,
      page_title: document.title,
    });
  }
}
