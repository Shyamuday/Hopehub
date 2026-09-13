import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';
import { AdminCanDirective } from '../../core/directives/admin-can.directive';
import { ADMIN_PERMISSIONS } from '../../core/admin-permissions';
import {
  AdminFormDrawerComponent,
  type AdminFormStep,
} from '../../shared/ui/admin-form-drawer.component';
import { AdminPageHeaderComponent } from '../../shared/ui/admin-page-header.component';

type Tab = 'offers' | 'banners' | 'leads';

const OFFER_TYPES = [
  'INDIVIDUAL_SESSION',
  'CARE_PACKAGE',
  'WORKSHOP',
  'MEETUP',
  'WEBINAR',
  'GROUP_SESSION',
  'RECORDED_SESSION',
  'ORGANISATION_PROGRAM',
  'CUSTOM',
];

const DELIVERY_MODES = [
  'ONLINE_AUDIO',
  'ONLINE_VIDEO',
  'RECORDED',
  'CHAT',
  'GROUP_ONLINE',
  'OFFLINE',
  'HYBRID',
  'CUSTOM',
];

const DISCOUNT_TYPES = ['NONE', 'PERCENT', 'FLAT', 'REFERRAL', 'CUSTOM'];
const PARTIAL_PAYMENT_TYPES = ['NONE', 'PERCENT', 'FLAT'];
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST'];
const MEDIA_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;
type MediaField = 'recordedAudioUrl' | 'recordedVideoUrl';
const MEDIA_ACCESS_MODES = ['PUBLIC', 'LOGIN_REQUIRED', 'PAID_ONLY'];

@Component({
  selector: 'app-hope-hub-offers-page',
  standalone: true,
  imports: [FormsModule, AdminCanDirective, AdminFormDrawerComponent, AdminPageHeaderComponent],
  templateUrl: './hope-hub-offers-page.html',
  styleUrl: './hope-hub-offers-page.scss',
})
export class HopeHubOffersPage implements OnInit {
  readonly managePermission = ADMIN_PERMISSIONS.CATALOG_WRITE;
  private readonly api = inject(AdminApi);

  readonly tab = signal<Tab>('offers');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploadingMedia = signal<MediaField | null>(null);
  readonly toast = signal('');
  readonly offerings = signal<any[]>([]);
  readonly banners = signal<any[]>([]);
  readonly leads = signal<any[]>([]);
  readonly offerTypes = OFFER_TYPES;
  readonly deliveryModes = DELIVERY_MODES;
  readonly discountTypes = DISCOUNT_TYPES;
  readonly partialPaymentTypes = PARTIAL_PAYMENT_TYPES;
  readonly leadStatuses = LEAD_STATUSES;
  readonly mediaAccessModes = MEDIA_ACCESS_MODES;
  readonly headerMetrics = computed(() => [
    {
      label: 'Live offers',
      value: this.offerings().filter((offer) => offer.isActive).length,
      tone: 'success' as const,
    },
    { label: 'Banners', value: this.banners().length },
    {
      label: 'New leads',
      value: this.leads().filter((lead) => lead.status === 'NEW').length,
      tone: 'warning' as const,
    },
  ]);

  readonly offerForm = signal(this.emptyOffer());
  readonly bannerForm = signal(this.emptyBanner());
  readonly offerEditorOpen = signal(false);
  readonly offerStep = signal(0);
  readonly bannerEditorOpen = signal(false);
  readonly bannerStep = signal(0);
  private offerBaseline = '';
  private bannerBaseline = '';
  readonly offerSteps: readonly AdminFormStep[] = [
    { id: 'basics', label: 'Basics' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'access', label: 'Access' },
    { id: 'review', label: 'Review' },
  ];
  readonly offerEditorTitle = computed(() =>
    this.offerForm().id ? `Edit ${this.offerForm().title}` : 'Create offer',
  );
  readonly offerEditorDescription = computed(() => {
    const copy = [
      'Set the public identity and booking route.',
      'Configure price, discounts, and partial payment.',
      'Add package, event, benefits, and audience details.',
      'Configure recordings and access eligibility.',
      'Confirm visibility and review the final consumer price.',
    ];
    return copy[this.offerStep()] || copy[0];
  });
  readonly bannerSteps: readonly AdminFormStep[] = [
    { id: 'content', label: 'Content' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'review', label: 'Review' },
  ];
  readonly bannerEditorTitle = computed(() =>
    this.bannerForm().id ? `Edit ${this.bannerForm().title}` : 'Create banner',
  );
  readonly bannerEditorDescription = computed(() => {
    const copy = [
      'Add the message, destination, and visual details.',
      'Choose when and where the banner should appear.',
      'Review the public banner before saving.',
    ];
    return copy[this.bannerStep()] || copy[0];
  });

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
    if (this.hasUnsavedChanges() && !confirm('Discard the unsaved editor changes?')) return;
    this.tab.set(tab);
    this.offerEditorOpen.set(false);
    this.offerStep.set(0);
    this.offerForm.set(this.emptyOffer());
    this.offerBaseline = '';
    this.bannerEditorOpen.set(false);
    this.bannerStep.set(0);
    this.bannerForm.set(this.emptyBanner());
    this.bannerBaseline = '';
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
      discountStartsAt: this.inputDateTime(offer.discountStartsAt),
      discountEndsAt: this.inputDateTime(offer.discountEndsAt),
      benefitsText: (offer.benefits || []).join('\n'),
      audienceText: (offer.audience || []).join('\n'),
      eventStartsAt: this.inputDateTime(offer.eventStartsAt),
      eventEndsAt: this.inputDateTime(offer.eventEndsAt),
      telegramGroupUrl: offer.metadata?.telegramGroupUrl || '',
      telegramAudioUrl: offer.metadata?.telegramAudioUrl || '',
      telegramVideoUrl: offer.metadata?.telegramVideoUrl || '',
      recordedAudioUrl: offer.metadata?.recordedAudioUrl || '',
      recordedVideoUrl: offer.metadata?.recordedVideoUrl || '',
      youtubeUrl: offer.metadata?.youtubeUrl || '',
      mediaAccessNote: offer.metadata?.mediaAccessNote || '',
      mediaAccessMode: offer.metadata?.mediaAccessMode || 'PUBLIC',
      allowedOfferingIdsText: (offer.metadata?.allowedOfferingIds || []).join('\n'),
      allowedOfferingSlugsText: (offer.metadata?.allowedOfferingSlugs || []).join('\n'),
      allowedOfferingCodesText: (offer.metadata?.allowedOfferingCodes || []).join('\n'),
    });
    this.tab.set('offers');
    this.offerStep.set(0);
    this.offerEditorOpen.set(true);
    this.offerBaseline = JSON.stringify(this.offerForm());
  }

  newOffer(): void {
    this.offerForm.set(this.emptyOffer());
    this.offerStep.set(0);
    this.offerEditorOpen.set(true);
    this.offerBaseline = JSON.stringify(this.offerForm());
  }

  closeOfferEditor(): void {
    if (this.saving()) return;
    if (this.offerHasUnsavedChanges() && !confirm('Discard the unsaved offer changes?')) return;
    this.offerEditorOpen.set(false);
    this.offerStep.set(0);
    this.offerForm.set(this.emptyOffer());
    this.offerBaseline = '';
  }

  nextOfferStep(): void {
    if (this.offerNextDisabled()) return;
    this.offerStep.update((step) => Math.min(step + 1, this.offerSteps.length - 1));
  }

  previousOfferStep(): void {
    this.offerStep.update((step) => Math.max(0, step - 1));
  }

  offerNextDisabled(): boolean {
    if (this.offerStep() !== 0) return false;
    const form = this.offerForm();
    return !form.code.trim() || !form.title.trim() || !form.description.trim();
  }

  editBanner(banner: any): void {
    this.bannerForm.set({
      ...this.emptyBanner(),
      ...banner,
      startsAt: this.inputDateTime(banner.startsAt),
      endsAt: this.inputDateTime(banner.endsAt),
    });
    this.tab.set('banners');
    this.bannerStep.set(0);
    this.bannerEditorOpen.set(true);
    this.bannerBaseline = JSON.stringify(this.bannerForm());
  }

  newBanner(): void {
    this.bannerForm.set(this.emptyBanner());
    this.bannerStep.set(0);
    this.bannerEditorOpen.set(true);
    this.bannerBaseline = JSON.stringify(this.bannerForm());
  }

  closeBannerEditor(): void {
    if (this.saving()) return;
    if (this.bannerHasUnsavedChanges() && !confirm('Discard the unsaved banner changes?')) return;
    this.bannerEditorOpen.set(false);
    this.bannerStep.set(0);
    this.bannerForm.set(this.emptyBanner());
    this.bannerBaseline = '';
  }

  offerHasUnsavedChanges(): boolean {
    return this.offerEditorOpen() && JSON.stringify(this.offerForm()) !== this.offerBaseline;
  }

  bannerHasUnsavedChanges(): boolean {
    return this.bannerEditorOpen() && JSON.stringify(this.bannerForm()) !== this.bannerBaseline;
  }

  hasUnsavedChanges(): boolean {
    return this.offerHasUnsavedChanges() || this.bannerHasUnsavedChanges();
  }

  @HostListener('window:beforeunload', ['$event'])
  protectUnsavedChanges(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) return;
    event.preventDefault();
  }

  nextBannerStep(): void {
    if (this.bannerNextDisabled()) return;
    this.bannerStep.update((step) => Math.min(step + 1, this.bannerSteps.length - 1));
  }

  previousBannerStep(): void {
    this.bannerStep.update((step) => Math.max(0, step - 1));
  }

  bannerNextDisabled(): boolean {
    if (this.bannerStep() !== 0) return false;
    const form = this.bannerForm();
    return !form.title.trim() || !form.routePath.trim();
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
        discountStartsAt: form.discountStartsAt || null,
        discountEndsAt: form.discountEndsAt || null,
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
        metadata: this.mediaMetadata(form),
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
      this.offerBaseline = '';
      this.offerEditorOpen.set(false);
      this.offerStep.set(0);
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
      this.bannerBaseline = '';
      this.bannerEditorOpen.set(false);
      this.bannerStep.set(0);
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

  async uploadRecordedMedia(event: Event, field: MediaField): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MEDIA_UPLOAD_LIMIT_BYTES) {
      this.showToast(
        'File is too large. Use YouTube, Telegram, or direct S3 link for recordings over 5 MB.',
      );
      return;
    }

    this.uploadingMedia.set(field);
    try {
      const uploaded = await this.api.uploadHopeHubMedia(file);
      this.offerForm.update((form) => ({ ...form, [field]: uploaded.fileUrl }));
      this.showToast(field === 'recordedAudioUrl' ? 'Audio uploaded' : 'Video uploaded');
    } catch {
      this.showToast('Could not upload media');
    } finally {
      this.uploadingMedia.set(null);
    }
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
    if (
      !form.discountEnabled ||
      form.discountType === 'NONE' ||
      price <= 0 ||
      !this.isPreviewDiscountActive()
    )
      return 0;

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

  isPreviewDiscountActive(): boolean {
    const form = this.offerForm();
    const now = Date.now();
    if (form.discountStartsAt && new Date(form.discountStartsAt).getTime() > now) return false;
    if (form.discountEndsAt && new Date(form.discountEndsAt).getTime() < now) return false;
    return true;
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
      discountStartsAt: '',
      discountEndsAt: '',
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
      telegramGroupUrl: '',
      telegramAudioUrl: '',
      telegramVideoUrl: '',
      recordedAudioUrl: '',
      recordedVideoUrl: '',
      youtubeUrl: '',
      mediaAccessNote: '',
      mediaAccessMode: 'PUBLIC',
      allowedOfferingIdsText: '',
      allowedOfferingSlugsText: '',
      allowedOfferingCodesText: '',
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

  private mediaMetadata(form: {
    telegramGroupUrl: string;
    telegramAudioUrl: string;
    telegramVideoUrl: string;
    recordedAudioUrl: string;
    recordedVideoUrl: string;
    youtubeUrl: string;
    mediaAccessNote: string;
    mediaAccessMode: string;
    allowedOfferingIdsText: string;
    allowedOfferingSlugsText: string;
    allowedOfferingCodesText: string;
  }): Record<string, string | string[]> | null {
    const metadata = {
      mediaAccessMode: form.mediaAccessMode.trim() || 'PUBLIC',
      telegramGroupUrl: form.telegramGroupUrl.trim(),
      telegramAudioUrl: form.telegramAudioUrl.trim(),
      telegramVideoUrl: form.telegramVideoUrl.trim(),
      recordedAudioUrl: form.recordedAudioUrl.trim(),
      recordedVideoUrl: form.recordedVideoUrl.trim(),
      youtubeUrl: form.youtubeUrl.trim(),
      mediaAccessNote: form.mediaAccessNote.trim(),
      allowedOfferingIds: this.lines(form.allowedOfferingIdsText),
      allowedOfferingSlugs: this.lines(form.allowedOfferingSlugsText),
      allowedOfferingCodes: this.lines(form.allowedOfferingCodesText),
    };
    const clean = Object.fromEntries(
      Object.entries(metadata).filter(([, value]) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value),
      ),
    );
    return Object.keys(clean).length ? clean : null;
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
