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

const DISCOUNT_TYPES = ['NONE', 'PERCENT', 'FLAT', 'REFERRAL', 'CUSTOM'];
const PARTIAL_PAYMENT_TYPES = ['NONE', 'PERCENT', 'FLAT'];
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
  readonly discountTypes = DISCOUNT_TYPES;
  readonly partialPaymentTypes = PARTIAL_PAYMENT_TYPES;
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
      discountFlatRupees:
        offer.discountFlatInPaise == null ? null : offer.discountFlatInPaise / 100,
      discountMaxRupees: offer.discountMaxInPaise == null ? null : offer.discountMaxInPaise / 100,
      partialPaymentFlatRupees:
        offer.partialPaymentFlatInPaise == null ? null : offer.partialPaymentFlatInPaise / 100,
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
        discountEnabled: Boolean(form.discountEnabled),
        discountType: form.discountEnabled ? form.discountType || 'NONE' : 'NONE',
        discountLabel: form.discountLabel || null,
        discountCode: form.discountCode || null,
        discountPercent: this.numberOrNull(form.discountPercent),
        discountFlatInPaise:
          form.discountFlatRupees == null
            ? null
            : Math.round(Number(form.discountFlatRupees) * 100),
        discountMaxInPaise:
          form.discountMaxRupees == null ? null : Math.round(Number(form.discountMaxRupees) * 100),
        partialPaymentEnabled: Boolean(form.partialPaymentEnabled),
        partialPaymentType: form.partialPaymentEnabled ? form.partialPaymentType || 'NONE' : 'NONE',
        partialPaymentLabel: form.partialPaymentLabel || null,
        partialPaymentPercent: this.numberOrNull(form.partialPaymentPercent),
        partialPaymentFlatInPaise:
          form.partialPaymentFlatRupees == null
            ? null
            : Math.round(Number(form.partialPaymentFlatRupees) * 100),
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

  showDiscountPercent(): boolean {
    const type = this.offerForm().discountType;
    return this.offerForm().discountEnabled && ['PERCENT', 'REFERRAL', 'CUSTOM'].includes(type);
  }

  showDiscountFlat(): boolean {
    const type = this.offerForm().discountType;
    return this.offerForm().discountEnabled && ['FLAT', 'REFERRAL', 'CUSTOM'].includes(type);
  }

  showPartialPercent(): boolean {
    return (
      this.offerForm().partialPaymentEnabled && this.offerForm().partialPaymentType === 'PERCENT'
    );
  }

  showPartialFlat(): boolean {
    return this.offerForm().partialPaymentEnabled && this.offerForm().partialPaymentType === 'FLAT';
  }

  previewPriceRupees(): number {
    return Math.max(0, Number(this.offerForm().priceRupees || 0));
  }

  previewDiscountRupees(): number {
    const form = this.offerForm();
    const price = this.previewPriceRupees();
    if (!form.discountEnabled || form.discountType === 'NONE' || price <= 0) return 0;

    let discount = 0;
    if (['PERCENT', 'REFERRAL', 'CUSTOM'].includes(form.discountType) && form.discountPercent) {
      discount = Math.round((price * Number(form.discountPercent)) / 100);
    }
    if (['FLAT', 'REFERRAL', 'CUSTOM'].includes(form.discountType) && form.discountFlatRupees) {
      discount = Math.max(discount, Number(form.discountFlatRupees));
    }
    if (form.discountMaxRupees) {
      discount = Math.min(discount, Number(form.discountMaxRupees));
    }
    return Math.max(0, Math.min(discount, Math.max(0, price - 1)));
  }

  previewFinalRupees(): number {
    return Math.max(0, this.previewPriceRupees() - this.previewDiscountRupees());
  }

  previewPayTodayRupees(): number {
    const form = this.offerForm();
    const finalPrice = this.previewFinalRupees();
    if (!form.partialPaymentEnabled || form.partialPaymentType === 'NONE' || finalPrice <= 0) {
      return finalPrice;
    }
    if (form.partialPaymentType === 'PERCENT' && form.partialPaymentPercent) {
      return Math.max(
        1,
        Math.min(finalPrice, Math.round((finalPrice * Number(form.partialPaymentPercent)) / 100)),
      );
    }
    if (form.partialPaymentType === 'FLAT' && form.partialPaymentFlatRupees) {
      return Math.max(1, Math.min(finalPrice, Number(form.partialPaymentFlatRupees)));
    }
    return finalPrice;
  }

  previewBalanceRupees(): number {
    return Math.max(0, this.previewFinalRupees() - this.previewPayTodayRupees());
  }

  formatRupees(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
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
      discountEnabled: false,
      discountType: 'NONE',
      discountLabel: '',
      discountCode: '',
      discountPercent: null as number | null,
      discountFlatRupees: null as number | null,
      discountMaxRupees: null as number | null,
      partialPaymentEnabled: false,
      partialPaymentType: 'NONE',
      partialPaymentLabel: '',
      partialPaymentPercent: null as number | null,
      partialPaymentFlatRupees: null as number | null,
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
