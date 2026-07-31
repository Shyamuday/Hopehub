import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';

type Tab = 'offers' | 'banners' | 'leads';

const OFFER_TYPES = [
  'INDIVIDUAL_SESSION',
  'CARE_PACKAGE',
  'WORKSHOP',
  'MEETUP',
  'WEBINAR',
  'GROUP_SESSION',
  'ORGANISATION_PROGRAM',
  'CUSTOM',
];

const DELIVERY_MODES = [
  'ONLINE_AUDIO',
  'ONLINE_VIDEO',
  'CHAT',
  'GROUP_ONLINE',
  'OFFLINE',
  'HYBRID',
  'CUSTOM',
];

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST'];

@Component({
  selector: 'app-hope-hub-offers-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './hope-hub-offers-page.html',
  styleUrl: './hope-hub-offers-page.scss',
})
export class HopeHubOffersPage implements OnInit {
  private readonly api = inject(AdminApi);

  readonly tab = signal<Tab>('offers');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly toast = signal('');
  readonly offerings = signal<any[]>([]);
  readonly banners = signal<any[]>([]);
  readonly leads = signal<any[]>([]);
  readonly offerTypes = OFFER_TYPES;
  readonly deliveryModes = DELIVERY_MODES;
  readonly leadStatuses = LEAD_STATUSES;

  readonly offerForm = signal(this.emptyOffer());
  readonly bannerForm = signal(this.emptyBanner());

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [offersRes, bannersRes, leadsRes] = await Promise.all([
        this.api.getHopeHubOfferingsAdmin(),
        this.api.getHopeHubBannersAdmin(),
        this.api.getHopeHubOrganizationLeadsAdmin(),
      ]);
      this.offerings.set(offersRes.offerings);
      this.banners.set(bannersRes.banners);
      this.leads.set(leadsRes.leads);
    } finally {
      this.loading.set(false);
    }
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  editOffer(offer: any): void {
    this.offerForm.set({
      ...this.emptyOffer(),
      ...offer,
      priceRupees: offer.priceInPaise == null ? null : offer.priceInPaise / 100,
      compareAtRupees:
        offer.compareAtPriceInPaise == null ? null : offer.compareAtPriceInPaise / 100,
      benefitsText: (offer.benefits || []).join('\n'),
      audienceText: (offer.audience || []).join('\n'),
      eventStartsAt: this.inputDateTime(offer.eventStartsAt),
      eventEndsAt: this.inputDateTime(offer.eventEndsAt),
    });
    this.tab.set('offers');
  }

  editBanner(banner: any): void {
    this.bannerForm.set({
      ...this.emptyBanner(),
      ...banner,
      startsAt: this.inputDateTime(banner.startsAt),
      endsAt: this.inputDateTime(banner.endsAt),
    });
    this.tab.set('banners');
  }

  async saveOffer(): Promise<void> {
    const form = this.offerForm();
    this.saving.set(true);
    try {
      const payload = {
        code: form.code,
        slug: form.slug || this.slugify(form.title),
        title: form.title,
        subtitle: form.subtitle || null,
        description: form.description,
        type: form.type,
        priceInPaise: form.priceRupees == null ? null : Math.round(Number(form.priceRupees) * 100),
        compareAtPriceInPaise:
          form.compareAtRupees == null ? null : Math.round(Number(form.compareAtRupees) * 100),
        currency: form.currency || 'INR',
        validityDays: this.numberOrNull(form.validityDays),
        sessionCount: this.numberOrNull(form.sessionCount),
        sessionDurationMinutes: this.numberOrNull(form.sessionDurationMinutes),
        deliveryMode: form.deliveryMode,
        eventStartsAt: form.eventStartsAt || null,
        eventEndsAt: form.eventEndsAt || null,
        seatLimit: this.numberOrNull(form.seatLimit),
        venue: form.venue || null,
        imageUrl: form.imageUrl || null,
        ctaLabel: form.ctaLabel || 'Book now',
        routePath: form.routePath || null,
        benefits: this.lines(form.benefitsText),
        audience: this.lines(form.audienceText),
        isActive: Boolean(form.isActive),
        isFeatured: Boolean(form.isFeatured),
        requiresLeadForm: Boolean(form.requiresLeadForm),
        sortOrder: Number(form.sortOrder || 0),
      };
      if (form.id) {
        await this.api.updateHopeHubOffering(form.id, payload);
      } else {
        await this.api.createHopeHubOffering(payload);
      }
      this.offerForm.set(this.emptyOffer());
      await this.load();
      this.showToast('Offer saved');
    } catch {
      this.showToast('Could not save offer');
    } finally {
      this.saving.set(false);
    }
  }

  async saveBanner(): Promise<void> {
    const form = this.bannerForm();
    this.saving.set(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || null,
        eyebrow: form.eyebrow || null,
        imageUrl: form.imageUrl || null,
        ctaLabel: form.ctaLabel || 'Explore',
        routePath: form.routePath,
        offeringId: form.offeringId || null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        isActive: Boolean(form.isActive),
        sortOrder: Number(form.sortOrder || 0),
        backgroundColor: form.backgroundColor || null,
        textColor: form.textColor || null,
      };
      if (form.id) {
        await this.api.updateHopeHubBanner(form.id, payload);
      } else {
        await this.api.createHopeHubBanner(payload);
      }
      this.bannerForm.set(this.emptyBanner());
      await this.load();
      this.showToast('Banner saved');
    } catch {
      this.showToast('Could not save banner');
    } finally {
      this.saving.set(false);
    }
  }

  async saveLead(lead: any): Promise<void> {
    await this.api.updateHopeHubOrganizationLead(lead.id, {
      status: lead.status,
      followUpNotes: lead.followUpNotes || null,
    });
    this.showToast('Lead updated');
  }

  formatPaise(value: number | null | undefined): string {
    if (value == null) return 'Custom';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value / 100);
  }

  resetOffer(): void {
    this.offerForm.set(this.emptyOffer());
  }

  resetBanner(): void {
    this.bannerForm.set(this.emptyBanner());
  }

  private emptyOffer() {
    return {
      id: '',
      code: '',
      slug: '',
      title: '',
      subtitle: '',
      description: '',
      type: 'CARE_PACKAGE',
      priceRupees: null as number | null,
      compareAtRupees: null as number | null,
      currency: 'INR',
      validityDays: null as number | null,
      sessionCount: null as number | null,
      sessionDurationMinutes: 30 as number | null,
      deliveryMode: 'ONLINE_AUDIO',
      eventStartsAt: '',
      eventEndsAt: '',
      seatLimit: null as number | null,
      venue: '',
      imageUrl: '',
      ctaLabel: 'Book now',
      routePath: '',
      benefitsText: '',
      audienceText: '',
      isActive: true,
      isFeatured: false,
      requiresLeadForm: false,
      sortOrder: 0,
    };
  }

  private emptyBanner() {
    return {
      id: '',
      title: '',
      subtitle: '',
      eyebrow: '',
      imageUrl: '',
      ctaLabel: 'Explore',
      routePath: '',
      offeringId: '',
      startsAt: '',
      endsAt: '',
      isActive: true,
      sortOrder: 0,
      backgroundColor: '#eef6ff',
      textColor: '#0f172a',
    };
  }

  private lines(value: string): string[] {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private numberOrNull(value: number | string | null | undefined): number | null {
    if (value === '' || value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private inputDateTime(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  }

  private showToast(message: string): void {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
