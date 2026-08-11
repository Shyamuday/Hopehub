import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, firstValueFrom } from 'rxjs';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import {
  CONSUMER_SUPPORT_PATHS,
  supportPathForExpertPreference,
  supportPathMeta,
} from '../../core/constants/support-paths.constants';
import { ContactForm } from '../../core/models/contact.model';
import {
  LeadService,
  LoadingService,
  AuthService,
  AuthModalService,
  BookingService,
  PaymentService,
  NotificationService,
  ConsumerFlowPreferencesService,
} from '../../core/services';
import { APP_CONSTANTS } from '../../core';
import {
  CONSUMER_CONCERN_CATEGORY_OPTIONS,
  CONSUMER_EXPERT_TYPE_OPTIONS,
  CONSUMER_LANGUAGE_OPTIONS,
  CONSUMER_LIVE_CONNECT_MODE_OPTIONS,
  CONSUMER_PROVIDER_GENDER_OPTIONS,
  CONSUMER_SAFETY_RISK_OPTIONS,
  CONSUMER_SESSION_MODE_OPTIONS,
  CONSUMER_URGENCY_OPTIONS,
  type ConsumerLiveConnectMode,
} from '../../core/constants/consumer-form-options.constants';
import { CONSUMER_UX_COPY } from '../../core/constants/consumer-ux-copy.constants';
import { CONSUMER_ROUTES } from '../../core/constants/consumer-routes.constants';
import { CONSUMER_STORAGE_KEYS } from '../../core/constants/storage-keys.constants';
import type {
  CareTeamServiceQuote,
  HopeHubCheckoutQuote,
  HopeHubOffering,
  HopeHubOfferingQuote,
  HopeHubProvider,
  HopeHubService,
} from '../../core/services/booking.service';
import {
  HOPE_HUB_ANALYTICS_EVENTS,
  ProductAnalyticsService,
} from '../../core/services/product-analytics.service';
import { PublicCommunicationConfigService } from '../../core/services/public-communication-config.service';
import {
  AppointmentCalendarComponent,
  AppointmentSlot,
  FormDropdownComponent,
  FormDropdownOption,
  PaymentFlowState,
  PaymentStatusOverlayComponent,
  SupportPathSelectorComponent,
} from '../../shared/components';
import { User } from '../../core/models/auth.model';

type LiveConnectMode = ConsumerLiveConnectMode;
type SupportPathPreference = ReturnType<typeof supportPathForExpertPreference>;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    AppointmentCalendarComponent,
    FormDropdownComponent,
    PaymentStatusOverlayComponent,
    SupportPathSelectorComponent,
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent implements OnInit {
  APP_CONSTANTS = APP_CONSTANTS;
  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  readonly notes = NOTE_CONTENT;
  private readonly pendingBookingStorageKey = CONSUMER_STORAGE_KEYS.pendingBooking;

  private formBuilder = inject(FormBuilder);
  private leadService = inject(LeadService);
  private loadingService = inject(LoadingService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);
  private bookingService = inject(BookingService);
  private paymentService = inject(PaymentService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);
  private productAnalytics = inject(ProductAnalyticsService);
  private publicConfig = inject(PublicCommunicationConfigService);
  private preferences = inject(ConsumerFlowPreferencesService);

  contactForm!: FormGroup;

  // Signal-based state
  isSubmitting = signal(false);
  showSuccessMessage = signal(false);
  showErrorMessage = signal(false);
  errorTitle = signal('Message could not be sent');
  errorMessage = signal('');
  selectedAppointment = signal<AppointmentSlot | null>(null);
  waitingForAuthToBook = signal(false);
  paymentFlowState = signal<PaymentFlowState>('IDLE');
  paymentFlowError = signal('');
  paymentFlowConsultation = signal<any | null>(null);
  prefilledData = signal<any>({});
  selectedOffering = signal<HopeHubOffering | null>(null);
  selectedOfferingQuote = signal<HopeHubOfferingQuote | null>(null);
  careTeamServiceQuote = signal<CareTeamServiceQuote | null>(null);
  careTeamServiceQuoteLoading = signal(false);
  careTeamServiceQuoteError = signal('');
  matchedProvider = signal<HopeHubProvider | null>(null);
  providerMatchLoading = signal(false);
  providerMatchMessage = signal('');
  quickTalkProviders = signal<Array<HopeHubProvider & { quickTalkAvailable?: boolean }>>([]);
  quickTalkLoading = signal(false);
  quickTalkMessage = signal('');
  quickTalkStartingProviderId = signal('');
  defaultSessionOffer = signal<HopeHubOffering | null>(null);
  defaultSessionQuote = signal<HopeHubOfferingQuote | null>(null);
  currentUser = signal<User | null>(null);
  promoCode = signal('');
  appliedPromoCode = signal('');
  checkoutQuote = signal<HopeHubCheckoutQuote | null>(null);
  checkoutQuoteLoading = signal(false);
  checkoutQuoteError = signal('');

  careTeamProfileLink(provider: HopeHubProvider): string[] {
    return [...CONSUMER_ROUTES.links.careTeam, provider.slug || provider.id];
  }
  services: HopeHubService[] = [];
  serviceOptions: FormDropdownOption[] = [{ value: '', label: 'Select a service (optional)' }];
  urgencyOptions: FormDropdownOption[] = CONSUMER_URGENCY_OPTIONS;
  concernCategoryOptions: FormDropdownOption[] = CONSUMER_CONCERN_CATEGORY_OPTIONS;
  expertTypeOptions: FormDropdownOption[] = CONSUMER_EXPERT_TYPE_OPTIONS;
  sessionModeOptions: FormDropdownOption[] = CONSUMER_SESSION_MODE_OPTIONS;
  readonly liveConnectModeOptions = CONSUMER_LIVE_CONNECT_MODE_OPTIONS;
  languageOptions: FormDropdownOption[] = CONSUMER_LANGUAGE_OPTIONS;
  providerGenderOptions: FormDropdownOption[] = CONSUMER_PROVIDER_GENDER_OPTIONS;
  safetyRiskOptions: FormDropdownOption[] = CONSUMER_SAFETY_RISK_OPTIONS;

  constructor() {
    this.readQueryParameters();
    this.loadUserData();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.restorePendingBooking();
    this.loadDefaultSessionOffer();
    this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.BOOKING_FORM_OPENED, {
      source: this.prefilledData().source || 'direct',
      serviceName: this.prefilledData().serviceName || this.prefilledData().service || '',
      offeringSlug: this.prefilledData().offering || '',
      paymentMode: this.prefilledData().paymentMode || 'FULL',
    });
  }

  private loadUserData(): void {
    // Subscribe to auth state to get logged-in user
    this.authService.user$.pipe(takeUntilDestroyed()).subscribe((user: User | null) => {
      this.currentUser.set(user);
      // If form is already initialized, update it with user data
      if (this.contactForm) {
        this.updateFormWithUserData(user);
      }
      if (user && this.waitingForAuthToBook()) {
        this.waitingForAuthToBook.set(false);
        setTimeout(() => void this.onSubmit(), 0);
      }
      this.loadCareTeamServiceQuote();
    });
  }

  private readQueryParameters(): void {
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params: any) => {
      const saved = this.preferences.read();
      const mode = this.normalizeLiveConnectMode(params['mode'] || saved.mode || '');
      this.prefilledData.set({
        service: params['service'] || '',
        serviceName: params['serviceName'] || '',
        consultant: params['consultant'] || '',
        providerId: params['providerId'] || '',
        careTeamServiceId: params['careTeamServiceId'] || '',
        consultantPhone: params['consultantPhone'] || '',
        duration: params['duration'] || '',
        price: params['price'] || '',
        offering: params['offering'] || '',
        offeringId: params['offeringId'] || '',
        paymentMode: params['paymentMode'] || 'FULL',
        source: params['source'] || '',
        supportPath: params['supportPath'] || '',
        supportPathLabel: params['supportPathLabel'] || '',
        preferredExpertType: params['preferredExpertType'] || '',
        concernCategory: params['concernCategory'] || params['concern'] || saved.concern || '',
        mode,
      });
      if (this.contactForm) {
        this.applyLiveConnectPrefill();
      }
      this.loadSelectedOffering(params);
      this.loadCareTeamServiceQuote();
    });
  }

  private loadCareTeamServiceQuote(): void {
    const data = this.prefilledData();
    if (!data.careTeamServiceId || !this.currentUser()) {
      this.careTeamServiceQuote.set(null);
      this.careTeamServiceQuoteLoading.set(false);
      this.careTeamServiceQuoteError.set('');
      return;
    }
    this.careTeamServiceQuoteLoading.set(true);
    this.careTeamServiceQuoteError.set('');
    this.bookingService
      .careTeamServiceQuote(data.careTeamServiceId, data.providerId || undefined)
      .subscribe({
        next: (quote) => {
          this.careTeamServiceQuote.set(quote);
          this.careTeamServiceQuoteLoading.set(false);
        },
        error: () => {
          this.careTeamServiceQuote.set(null);
          this.careTeamServiceQuoteLoading.set(false);
          this.careTeamServiceQuoteError.set('Could not load exact service price yet.');
        },
      });
  }

  private loadSelectedOffering(params: any): void {
    const offeringKey = params['offering'] || params['offeringId'] || '';
    if (!offeringKey) {
      this.selectedOffering.set(null);
      this.selectedOfferingQuote.set(null);
      return;
    }

    this.bookingService.offeringQuote(offeringKey).subscribe({
      next: ({ offering, quote }) => {
        this.selectedOffering.set(offering);
        this.selectedOfferingQuote.set(quote);
      },
      error: () => {
        this.selectedOffering.set(null);
        this.selectedOfferingQuote.set(null);
      },
    });
  }

  private initializeForm(): void {
    // Determine initial service value and message
    const initialServiceValue =
      this.prefilledData().serviceName ||
      this.prefilledData().service ||
      (this.isLiveConnectFallback() ? 'Hope Hub Consultation' : '');
    const initialMessage = this.generateInitialMessage();

    // Get user data if logged in
    const user = this.currentUser();
    const userName = this.getUserName(user);
    const userEmail = user?.email || '';
    const userPhone = this.getUserPhone(user);

    this.contactForm = this.formBuilder.group({
      name: [userName, [Validators.required]],
      email: [userEmail, [Validators.required, Validators.email]],
      phone: [userPhone],
      serviceInterest: [initialServiceValue],
      urgencyLevel: ['normal', [Validators.required]],
      preferredTime: [''],
      concernCategory: [''],
      preferredExpertType: [this.initialPreferredExpertType()],
      sessionMode: [this.initialSessionMode()],
      preferredLanguage: [''],
      preferredProviderGender: [''],
      autoMatchProvider: [true],
      safetyRisk: ['none'],
      previousTherapyOrMedication: [''],
      emergencyConsent: [true],
      listenerSupportConsent: [false],
      preferAnonymousTelegram: [false],
      message: [initialMessage],
      preferredContact: ['telegram', [Validators.required]],
    });

    this.contactForm
      .get('serviceInterest')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyDefaultSessionOffer());
    this.contactForm.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.updateProviderSuggestion();
        void this.loadQuickTalkProviders();
      });
    void this.updateProviderSuggestion();
    void this.loadQuickTalkProviders();
  }

  isLiveConnectFallback(): boolean {
    return this.prefilledData().source === 'live-connect';
  }

  requestedLiveMode(): LiveConnectMode {
    if (this.contactForm) return this.activeQuickTalkMode();
    return this.normalizeLiveConnectMode(this.prefilledData().mode) || 'voice';
  }

  requestedLiveModeLabel(): string {
    const mode = this.requestedLiveMode();
    if (mode === 'video') return 'video';
    if (mode === 'voice') return 'voice';
    return 'chat';
  }

  liveConnectHeroTitle(): string {
    if (!this.isLiveConnectFallback()) return CONSUMER_UX_COPY.booking.pageTitle;
    return `Book ${this.requestedLiveModeLabel()} support`;
  }

  liveConnectHeroCopy(): string {
    if (!this.isLiveConnectFallback()) {
      return 'Share a few preferences, choose a slot, and continue with private Hope Hub support.';
    }
    return `No live ${this.requestedLiveModeLabel()} expert was available immediately, so we brought you here to book the next suitable ${CONSUMER_UX_COPY.booking.fallbackOption} without starting over.`;
  }

  liveConnectHandoffTitle(): string {
    return `We kept your ${this.requestedLiveModeLabel()} preference`;
  }

  liveConnectHandoffCopy(): string {
    return 'Choose a slot below, or use Quick Talk if someone comes online before you book.';
  }

  bookingSummaryTitle(): string {
    return (
      this.contactForm?.get('serviceInterest')?.value ||
      this.prefilledData().serviceName ||
      this.prefilledData().service ||
      'Hope Hub support'
    );
  }

  bookingSummaryItems(): string[] {
    const data = this.prefilledData();
    const form = this.contactForm;
    const concern = form?.get('concernCategory')?.value || data.concernCategory || '';
    const offer = this.selectedOffering();
    const duration =
      data.duration || (offer?.sessionDurationMinutes ? `${offer.sessionDurationMinutes} min` : '');
    const consultant = data.consultant || this.matchedProvider()?.name || '';
    const supportPathLabel =
      data.supportPathLabel ||
      this.supportPathLabelFromPreference(
        supportPathForExpertPreference(form?.get('preferredExpertType')?.value || data.supportPath),
      );

    return [
      concern ? `Concern: ${concern}` : '',
      `Mode: ${this.requestedLiveModeLabel()}`,
      duration ? `Duration: ${duration}` : '',
      consultant ? `Provider: ${consultant}` : '',
      supportPathLabel ? `Support: ${supportPathLabel}` : '',
    ].filter(Boolean);
  }

  setLiveConnectMode(mode: LiveConnectMode): void {
    this.prefilledData.set({ ...this.prefilledData(), mode });
    this.contactForm.patchValue({ sessionMode: this.sessionModeForLiveConnectMode(mode) });
    this.selectedAppointment.set(null);
    void this.loadQuickTalkProviders();
  }

  activeSupportPathPreference() {
    return supportPathForExpertPreference(
      this.contactForm?.get('preferredExpertType')?.value ||
        this.prefilledData().supportPath ||
        this.prefilledData().preferredExpertType,
    );
  }

  setSupportPathPreference(value: string): void {
    if (!this.contactForm) return;
    this.contactForm.patchValue({ preferredExpertType: value });
    this.selectedAppointment.set(null);
    void this.updateProviderSuggestion();
    void this.loadQuickTalkProviders();
  }

  private supportPathLabelFromPreference(value: SupportPathPreference): string {
    return value ? supportPathMeta(value).label : '';
  }

  private updateFormWithUserData(user: User | null): void {
    if (!user || !this.contactForm) return;

    const userName = this.getUserName(user);
    const userEmail = user.email || '';
    const userPhone = this.getUserPhone(user);

    // Only update if fields are empty (don't overwrite user input)
    if (!this.contactForm.get('name')?.value) {
      this.contactForm.patchValue({ name: userName });
    }
    if (!this.contactForm.get('email')?.value) {
      this.contactForm.patchValue({ email: userEmail });
    }
    if (!this.contactForm.get('phone')?.value) {
      this.contactForm.patchValue({ phone: userPhone });
    }
    if (!this.contactForm.get('preferredContact')?.value) {
      this.contactForm.patchValue({ preferredContact: 'email' });
    }
  }

  private loadDefaultSessionOffer(): void {
    this.bookingService
      .servicesPageData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ services, singleSessionQuote }) => {
          this.services = services;
          this.serviceOptions = [
            { value: '', label: 'Select a service (optional)' },
            ...services.map((service) => ({ value: service.name, label: service.name })),
          ];
          this.defaultSessionOffer.set(singleSessionQuote?.offering ?? null);
          this.defaultSessionQuote.set(singleSessionQuote?.quote ?? null);
          this.applyDefaultSessionOffer();
        },
        error: () => {
          this.defaultSessionOffer.set(null);
          this.defaultSessionQuote.set(null);
        },
      });
  }

  private applyDefaultSessionOffer(): void {
    if (
      this.prefilledData().offering ||
      this.prefilledData().offeringId ||
      this.prefilledData().careTeamServiceId ||
      this.prefilledData().providerId ||
      this.selectedOffering()
    ) {
      return;
    }
    if (!this.contactForm?.get('serviceInterest')?.value) {
      return;
    }
    const offer = this.defaultSessionOffer();
    const quote = this.defaultSessionQuote();
    if (!offer || !quote) return;
    this.selectedOffering.set(offer);
    this.selectedOfferingQuote.set(quote);
  }

  private getUserName(user: User | null): string {
    if (!user) return '';

    // Try to get full name from profile
    if (user.profile?.firstName || user.profile?.lastName) {
      const firstName = user.profile.firstName || '';
      const lastName = user.profile.lastName || '';
      return `${firstName} ${lastName}`.trim();
    }

    // Fall back to name
    return user.name || '';
  }

  private getUserPhone(user: User | null): string {
    return user?.mobile || '';
  }

  private generateInitialMessage(): string {
    const data = this.prefilledData();
    if (data.source === 'live-connect') {
      const mode = this.normalizeLiveConnectMode(data.mode) || 'voice';
      const supportPath = supportPathForExpertPreference(
        data.supportPath || data.preferredExpertType,
      );
      const supportText = supportPath ? ` with ${supportPathMeta(supportPath).title}` : '';
      return `I tried Live Connect for ${mode} support${supportText}, but no one was available. I want to book the next suitable consultation.`;
    }

    if (data.serviceName && data.consultant) {
      let message = `Interested in ${data.serviceName}`;

      if (data.consultant) {
        message += ` with ${data.consultant}`;
      }

      if (data.duration) {
        message += ` (${data.duration} session)`;
      }

      const supportPath = supportPathForExpertPreference(
        data.supportPath || data.preferredExpertType,
      );
      if (supportPath) {
        message += ` Preference: ${supportPathMeta(supportPath).label}`;
      }

      message += '.';

      if (data.consultantPhone) {
        message += ` I noticed the consultant's contact is ${data.consultantPhone}.`;
      }

      return message;
    }

    return '';
  }

  onAppointmentSelected(appointment: AppointmentSlot): void {
    this.selectedAppointment.set(appointment);
    this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.SLOT_SELECTED, {
      serviceName:
        this.contactForm?.get('serviceInterest')?.value || this.prefilledData().serviceName || '',
      appointmentDate: this.formatLocalDate(appointment.date),
      appointmentTime: appointment.time,
      providerId: this.activeProviderId(),
      offeringSlug: this.selectedOffering()?.slug || this.prefilledData().offering || '',
    });
  }

  activeProviderId(): string {
    const data = this.prefilledData();
    if (data.providerId) return data.providerId;
    if (!this.contactForm?.get('autoMatchProvider')?.value) return '';
    return this.matchedProvider()?.id || '';
  }

  activeProviderName(): string {
    const data = this.prefilledData();
    if (data.consultant) return data.consultant;
    if (!this.contactForm?.get('autoMatchProvider')?.value) return '';
    return this.matchedProvider()?.name || '';
  }

  activeProviderNotice(): string {
    const data = this.prefilledData();
    if (data.providerId && data.consultant) return `Selected provider: ${data.consultant}`;
    if (!this.contactForm?.get('autoMatchProvider')?.value) {
      return 'Auto-match is off. Our team will assign a suitable provider after review.';
    }
    const provider = this.matchedProvider();
    if (provider) return `Auto-matched: ${provider.name}`;
    return this.providerMatchMessage();
  }

  needsListenerSupportConsent(provider?: HopeHubProvider | null): boolean {
    const selectedProvider = provider || this.matchedProvider();
    const text = [
      selectedProvider?.supportRole,
      selectedProvider?.careTeamType,
      selectedProvider?.supportRoleLabel,
      selectedProvider?.supportTierLabel,
      this.prefilledData().serviceName,
      this.prefilledData().service,
      this.prefilledData().consultant,
      this.contactForm?.get('preferredExpertType')?.value,
      this.contactForm?.get('serviceInterest')?.value,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return /listener|volunteer|peer support/.test(text);
  }

  listenerSupportConsentAccepted(): boolean {
    return Boolean(this.contactForm?.get('listenerSupportConsent')?.value);
  }

  matchedProviderMeta(provider: HopeHubProvider): string {
    return [
      provider.supportRoleLabel,
      provider.gender ? this.genderLabel(provider.gender) : '',
      provider.languages?.slice(0, 3).join(', '),
    ]
      .filter(Boolean)
      .join(' · ');
  }

  quickTalkSessionMeta(provider: HopeHubProvider): string {
    const service = this.quickTalkServiceForProvider(provider);
    const duration = service?.durationMinutes || provider.sessionDurationMinutes || 30;
    return `${duration} min live session`;
  }

  quickTalkTitle(): string {
    return `Quick ${this.requestedLiveModeLabel()} if someone is live`;
  }

  quickTalkCopy(): string {
    return `We will check for providers currently accepting ${this.requestedLiveModeLabel()} sessions. If no one is live, keep the scheduled booking below.`;
  }

  private genderLabel(value: string): string {
    const labels: Record<string, string> = {
      FEMALE: 'Female',
      MALE: 'Male',
      OTHER: 'Other',
      PREFER_NOT_TO_SAY: 'Prefer not to say',
    };
    return labels[value] || value;
  }

  async onSubmit(): Promise<void> {
    if (this.contactForm.valid) {
      const appointment = this.selectedAppointment();
      this.isSubmitting.set(true);
      this.loadingService.show();
      this.showSuccessMessage.set(false);
      this.showErrorMessage.set(false);
      this.errorTitle.set(
        appointment ? 'Appointment could not be completed' : 'Message could not be sent',
      );
      this.errorMessage.set('');

      const formData: ContactForm = this.contactForm.value;
      const serviceSelected = Boolean(formData.serviceInterest || this.prefilledData().serviceName);

      // Add appointment information if selected
      if (appointment) {
        (formData as any).appointmentDate = appointment.date.toLocaleDateString();
        (formData as any).appointmentTime = appointment.time;
      }

      // Add pre-filled service information for the lead record
      const data = this.prefilledData();
      if (data.serviceName || data.consultant) {
        (formData as any).selectedService = data.serviceName;
        (formData as any).selectedConsultant = data.consultant;
        (formData as any).consultantPhone = data.consultantPhone;
        (formData as any).sessionDuration = data.duration;
        (formData as any).bookingSource = data.source;
      }

      try {
        if (serviceSelected && !appointment) {
          this.showErrorMessage.set(true);
          this.errorTitle.set('Choose a slot to continue');
          this.errorMessage.set('Select an appointment slot before payment.');
          this.notificationService.warning('Select an appointment slot before payment.');
          return;
        }
        if (this.needsListenerSupportConsent() && !this.listenerSupportConsentAccepted()) {
          this.showErrorMessage.set(true);
          this.errorTitle.set('Confirm listener support scope');
          this.errorMessage.set(
            'Please confirm you understand listener support is non-clinical and not emergency care.',
          );
          this.notificationService.warning(this.errorMessage());
          return;
        }

        if (appointment) {
          await this.submitBooking(formData, appointment);
        } else {
          await this.submitLead(formData);
        }
      } catch (error: any) {
        const message = this.readErrorMessage(error);
        this.showErrorMessage.set(true);
        this.errorMessage.set(message);
        this.notificationService.error(message);
        setTimeout(() => {
          this.showErrorMessage.set(false);
          this.errorMessage.set('');
        }, 8000);
      } finally {
        this.isSubmitting.set(false);
        this.loadingService.hide();
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.contactForm.controls).forEach((key) => {
        this.contactForm.get(key)?.markAsTouched();
      });
      this.notificationService.warning('Please complete the required booking fields.');
    }
  }

  private readErrorMessage(error: any): string {
    return (
      error?.error?.message || error?.message || 'An unexpected error occurred. Please try again.'
    );
  }

  private async submitBooking(formData: ContactForm, appointment: AppointmentSlot): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.savePendingBooking(formData, appointment);
      this.waitingForAuthToBook.set(true);
      this.notificationService.info('Sign up or log in to continue to secure payment.');
      this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.LOGIN_REQUIRED, {
        serviceName: formData.serviceInterest || this.prefilledData().serviceName || '',
        offeringSlug: this.selectedOffering()?.slug || this.prefilledData().offering || '',
      });
      this.authModalService.openRegister();
      throw new Error('Sign up or log in to continue to secure payment.');
    }

    const data = this.prefilledData();
    const activeProviderId = this.activeProviderId();
    const activeProviderName = this.activeProviderName();
    const selectedOffer = this.selectedOffering();
    const serviceName =
      formData.serviceInterest || data.serviceName || data.service || 'Hope Hub Consultation';
    const bookingMessage =
      formData.message?.trim() ||
      [serviceName, (formData as any).concernCategory, (formData as any).preferredLanguage]
        .filter(Boolean)
        .join(' | ') ||
      'Consultation request';
    const response = await new Promise<{ consultation: any }>((resolve, reject) => {
      this.bookingService
        .createBooking({
          serviceName,
          servicePriceInPaise: this.resolveServicePriceInPaise(serviceName),
          offeringId: data.offeringId || selectedOffer?.id || '',
          offeringSlug: data.offering || selectedOffer?.slug || '',
          paymentMode: data.paymentMode === 'PARTIAL' ? 'PARTIAL' : 'FULL',
          promoCode: this.checkoutPromoCode(),
          message: bookingMessage,
          appointmentDate: this.formatLocalDate(appointment.date),
          appointmentTime: appointment.time,
          consultantName: activeProviderName || appointment.consultant || '',
          consultantPhone: data.consultantPhone || '',
          providerId: activeProviderId,
          careTeamServiceId: data.careTeamServiceId || '',
          sessionDuration: data.duration || '',
          visitorName: formData.name,
          visitorEmail: formData.email,
          visitorPhone: formData.phone || '',
          preferredContact: formData.preferredContact,
          urgencyLevel: formData.urgencyLevel,
          preferredTime: formData.preferredTime || '',
          concernCategory: (formData as any).concernCategory || '',
          preferredExpertType: (formData as any).preferredExpertType || '',
          sessionMode: (formData as any).sessionMode || '',
          preferredLanguage: (formData as any).preferredLanguage || '',
          preferredProviderGender: (formData as any).preferredProviderGender || '',
          safetyRisk: (formData as any).safetyRisk || '',
          previousTherapyOrMedication: (formData as any).previousTherapyOrMedication || '',
          emergencyConsent: Boolean((formData as any).emergencyConsent),
          listenerSupportConsent: this.listenerSupportConsentAccepted(),
          preferAnonymousTelegram: Boolean(formData.preferAnonymousTelegram),
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
        })
        .subscribe({ next: resolve, error: reject });
    });

    this.paymentFlowConsultation.set(response.consultation);
    this.paymentFlowError.set('');
    const payableFromServer = Number(response.consultation?.payment?.amountInPaise ?? 0);
    if (payableFromServer <= 0) {
      this.paymentFlowState.set('SUCCESS');
      this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.PAYMENT_SUCCESS, {
        consultationId: response.consultation.id,
        serviceName,
        offeringSlug: selectedOffer?.slug || data.offering || '',
        payableInPaise: 0,
      });
      this.clearPendingBooking();
      this.showSuccessAndReset('Free booking confirmed. We will share the next details soon.');
      return;
    }
    this.paymentFlowState.set('CREATING_ORDER');
    this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.PAYMENT_STARTED, {
      consultationId: response.consultation.id,
      serviceName,
      offeringSlug: selectedOffer?.slug || data.offering || '',
      paymentMode: data.paymentMode === 'PARTIAL' ? 'PARTIAL' : 'FULL',
      payableInPaise: this.payTodayInPaise(),
    });
    try {
      await this.paymentService.payConsultation(response.consultation, {
        onOrderCreated: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
        onCheckoutOpened: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
        onVerifying: () => this.paymentFlowState.set('VERIFYING'),
      });
    } catch (error) {
      const message = this.readErrorMessage(error);
      this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.PAYMENT_FAILED, {
        consultationId: response.consultation.id,
        serviceName,
        offeringSlug: selectedOffer?.slug || data.offering || '',
        message,
      });
      throw error;
    }
    this.paymentFlowState.set('SUCCESS');
    this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.PAYMENT_SUCCESS, {
      consultationId: response.consultation.id,
      serviceName,
      offeringSlug: selectedOffer?.slug || data.offering || '',
    });
    this.clearPendingBooking();
    this.showSuccessAndReset('Appointment booked and payment verified successfully.');
  }

  async startQuickTalk(provider?: HopeHubProvider): Promise<void> {
    if (this.isSubmitting() || this.quickTalkStartingProviderId()) return;
    const user = this.currentUser();
    if (!user) {
      this.notificationService.info('Sign up or log in to start Quick Talk.');
      this.authModalService.openRegister();
      return;
    }

    const formData = (this.contactForm?.value || {}) as ContactForm;
    const providerId = provider?.id || this.activeProviderId();
    if (this.needsListenerSupportConsent(provider) && !this.listenerSupportConsentAccepted()) {
      this.notificationService.warning(
        'Please confirm you understand listener support is non-clinical and not emergency care.',
      );
      return;
    }
    this.quickTalkStartingProviderId.set(providerId || 'auto');
    this.isSubmitting.set(true);
    this.paymentFlowError.set('');
    this.quickTalkMessage.set('');
    try {
      const response = await firstValueFrom(
        this.bookingService.createQuickTalk({
          providerId,
          careTeamServiceId:
            provider && !this.prefilledData().careTeamServiceId
              ? this.quickTalkServiceForProvider(provider)?.id || ''
              : this.prefilledData().careTeamServiceId || '',
          message: formData.message || '',
          concernCategory: formData.concernCategory || '',
          preferredExpertType: formData.preferredExpertType || '',
          sessionMode: formData.sessionMode || 'online_audio',
          preferredLanguage: formData.preferredLanguage || '',
          preferredProviderGender: formData.preferredProviderGender || '',
          safetyRisk: formData.safetyRisk || '',
          previousTherapyOrMedication: formData.previousTherapyOrMedication || '',
          emergencyConsent: Boolean(formData.emergencyConsent),
          listenerSupportConsent: this.listenerSupportConsentAccepted(),
          promoCode: this.checkoutPromoCode(),
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
        }),
      );

      this.paymentFlowConsultation.set(response.consultation);
      const payableFromServer = Number(response.consultation?.payment?.amountInPaise ?? 0);
      if (payableFromServer > 0) {
        this.paymentFlowState.set('CREATING_ORDER');
        await this.paymentService.payConsultation(response.consultation, {
          onOrderCreated: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
          onCheckoutOpened: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
          onVerifying: () => this.paymentFlowState.set('VERIFYING'),
        });
      }

      this.paymentFlowState.set('SUCCESS');
      this.quickTalkMessage.set(
        `Quick Talk is ready with ${response.provider?.name || 'an available expert'}. Open your dashboard to join when assigned.`,
      );
      this.notificationService.success('Quick Talk confirmed. Please open your dashboard to join.');
      void this.loadQuickTalkProviders();
    } catch (error) {
      const message = this.readErrorMessage(error);
      this.paymentFlowError.set(message);
      this.paymentFlowState.set('ERROR');
      this.quickTalkMessage.set(message);
      this.notificationService.error(message);
    } finally {
      this.quickTalkStartingProviderId.set('');
      this.isSubmitting.set(false);
    }
  }

  retrySelectedPayment(): void {
    const consultation = this.paymentFlowConsultation();
    if (!consultation || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.paymentFlowError.set('');
    this.paymentFlowState.set('CREATING_ORDER');
    void this.paymentService
      .payConsultation(consultation, {
        onOrderCreated: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
        onCheckoutOpened: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
        onVerifying: () => this.paymentFlowState.set('VERIFYING'),
      })
      .then(() => {
        this.paymentFlowState.set('SUCCESS');
        this.showSuccessAndReset('Appointment booked and payment verified successfully.');
      })
      .catch((error) => {
        const message = this.readErrorMessage(error);
        this.paymentFlowError.set(message);
        this.paymentFlowState.set('ERROR');
        this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.PAYMENT_FAILED, {
          consultationId: consultation.id,
          message,
        });
        this.notificationService.error(message);
      })
      .finally(() => this.isSubmitting.set(false));
  }

  closePaymentOverlay(): void {
    const state = this.paymentFlowState();
    if (state === 'SUCCESS' || state === 'ERROR') {
      this.paymentFlowState.set('IDLE');
      this.paymentFlowError.set('');
      if (state === 'SUCCESS') {
        this.paymentFlowConsultation.set(null);
      }
    }
  }

  paymentFlowTitle(): string {
    const state = this.paymentFlowState();
    if (state === 'CREATING_ORDER') return 'Preparing payment';
    if (state === 'OPENING_CHECKOUT') return 'Secure checkout';
    if (state === 'VERIFYING') return 'Confirming payment';
    if (state === 'SUCCESS') return 'Payment confirmed';
    if (state === 'ERROR') return 'Payment needs attention';
    return '';
  }

  paymentFlowMessage(): string {
    const state = this.paymentFlowState();
    if (state === 'CREATING_ORDER') return 'Setting up a secure payment for your session.';
    if (state === 'OPENING_CHECKOUT') return 'Complete payment in the secure checkout window.';
    if (state === 'VERIFYING') return 'Confirming your payment. Please keep this page open.';
    if (state === 'SUCCESS')
      return 'Your request is confirmed. We will share the next details soon.';
    if (state === 'ERROR') {
      return this.paymentFlowError() || 'Payment could not be completed. You can retry safely.';
    }
    return '';
  }

  paymentButtonLabel(): string {
    if (!this.selectedAppointment()) {
      return this.contactForm.get('serviceInterest')?.value
        ? 'Choose slot to pay'
        : CONSUMER_UX_COPY.cta.bookSupport;
    }
    if (this.payTodayInPaise() <= 0) {
      return 'Confirm free booking';
    }
    return this.prefilledData().paymentMode === 'PARTIAL' ? 'Book and pay deposit' : 'Book and pay';
  }

  updatePromoCode(value: string): void {
    this.promoCode.set(
      value
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '')
        .slice(0, 32),
    );
    if (this.appliedPromoCode() && this.appliedPromoCode() !== this.promoCode()) {
      this.appliedPromoCode.set('');
    }
    this.checkoutQuote.set(null);
    this.checkoutQuoteError.set('');
  }

  async applyPromoCode(): Promise<void> {
    const code = this.promoCode().trim().toUpperCase();
    if (code.length < 2) {
      this.appliedPromoCode.set('');
      this.checkoutQuote.set(null);
      this.notificationService.info('Enter a valid coupon code.');
      return;
    }

    const grossInPaise = this.basePayTodayInPaise();
    if (grossInPaise <= 0) {
      this.appliedPromoCode.set(code);
      this.checkoutQuote.set(null);
      this.checkoutQuoteError.set('');
      this.notificationService.success('Coupon saved for checkout.');
      return;
    }

    if (!this.currentUser()) {
      this.appliedPromoCode.set(code);
      this.checkoutQuote.set(null);
      this.checkoutQuoteError.set('Sign up or log in to validate this coupon.');
      this.notificationService.info('Sign up or log in to validate this coupon.');
      this.authModalService.openRegister();
      return;
    }

    this.checkoutQuoteLoading.set(true);
    this.checkoutQuoteError.set('');
    try {
      const { quote } = await firstValueFrom(
        this.bookingService.checkoutQuote({
          grossInPaise,
          promoCode: code,
          ...this.checkoutScope(),
        }),
      );
      this.appliedPromoCode.set(code);
      this.checkoutQuote.set(quote);
      if (quote.discountInPaise > 0) {
        this.notificationService.success('Coupon applied.');
      } else {
        this.checkoutQuoteError.set('No coupon discount applies to this checkout.');
        this.notificationService.info('No discount applies to this checkout.');
      }
    } catch (error) {
      this.appliedPromoCode.set('');
      this.checkoutQuote.set(null);
      const message = this.readErrorMessage(error);
      this.checkoutQuoteError.set(message || 'Coupon could not be applied.');
      this.notificationService.error(this.checkoutQuoteError());
    } finally {
      this.checkoutQuoteLoading.set(false);
    }
  }

  clearPromoCode(): void {
    this.promoCode.set('');
    this.appliedPromoCode.set('');
    this.checkoutQuote.set(null);
    this.checkoutQuoteError.set('');
  }

  checkoutPromoCode(): string {
    return (this.appliedPromoCode() || this.promoCode()).trim().toUpperCase();
  }

  checkoutScope(): {
    serviceName?: string;
    offeringId?: string;
    careTeamServiceId?: string;
    providerId?: string;
  } {
    const data = this.prefilledData();
    const selectedOffer = this.selectedOffering();
    return {
      serviceName:
        this.contactForm?.get('serviceInterest')?.value ||
        data.serviceName ||
        data.service ||
        selectedOffer?.title ||
        '',
      offeringId: data.offeringId || selectedOffer?.id || '',
      careTeamServiceId: data.careTeamServiceId || '',
      providerId: this.activeProviderId() || data.providerId || '',
    };
  }

  offerDiscountInPaise(): number {
    const quote = this.selectedOfferingQuote();
    const quotedOffer = this.selectedOffering();
    if (quote && quotedOffer && quote.grossInPaise === quotedOffer.priceInPaise) {
      return quote.discountInPaise;
    }
    const offer = this.selectedOffering();
    if (!offer?.isDiscountActive || offer.discountType === 'NONE' || !offer.priceInPaise) return 0;
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

  offerFinalInPaise(): number {
    const serviceQuote = this.careTeamServiceQuote();
    if (serviceQuote) return serviceQuote.quote.amountInPaise;
    const offer = this.selectedOffering();
    if (!offer?.priceInPaise)
      return this.resolveServicePriceInPaise(this.contactForm?.get('serviceInterest')?.value || '');
    return Math.max(0, offer.priceInPaise - this.offerDiscountInPaise());
  }

  couponDiscountInPaise(): number {
    const quote = this.checkoutQuote();
    if (!quote || !this.appliedPromoCode()) return 0;
    return quote.grossAmountInPaise === this.basePayTodayInPaise() ? quote.discountInPaise : 0;
  }

  basePayTodayInPaise(): number {
    const serviceQuote = this.careTeamServiceQuote();
    if (serviceQuote) return serviceQuote.quote.payableInPaise;
    const offer = this.selectedOffering();
    const finalAmount = this.offerFinalInPaise();
    if (
      this.prefilledData().paymentMode !== 'PARTIAL' ||
      !offer?.partialPaymentEnabled ||
      offer.partialPaymentType === 'NONE'
    ) {
      return finalAmount;
    }
    if (offer.partialPaymentType === 'PERCENT' && offer.partialPaymentPercent) {
      return Math.max(
        100,
        Math.min(finalAmount, Math.round((finalAmount * offer.partialPaymentPercent) / 100)),
      );
    }
    if (offer.partialPaymentType === 'FLAT' && offer.partialPaymentFlatInPaise) {
      return Math.max(100, Math.min(finalAmount, offer.partialPaymentFlatInPaise));
    }
    return finalAmount;
  }

  payTodayInPaise(): number {
    const quote = this.checkoutQuote();
    const basePayable = this.basePayTodayInPaise();
    if (quote && this.appliedPromoCode() && quote.grossAmountInPaise === basePayable) {
      return quote.payableInPaise;
    }
    return basePayable;
  }

  balanceDueInPaise(): number {
    return Math.max(0, this.offerFinalInPaise() - this.basePayTodayInPaise());
  }

  formatPaise(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value / 100);
  }

  private async submitLead(formData: ContactForm): Promise<void> {
    const leadData: ContactForm = {
      ...formData,
      message:
        formData.message?.trim() ||
        [
          formData.serviceInterest || 'General enquiry',
          (formData as any).concernCategory,
          formData.preferredContact ? `Contact by ${formData.preferredContact}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
    };
    const success = await new Promise<boolean>((resolve, reject) => {
      this.leadService.sendContactForm(leadData).subscribe({ next: resolve, error: reject });
    });
    if (!success) {
      throw new Error('Failed to send message. Please try again.');
    }
    this.showSuccessAndReset('Request sent successfully.');
  }

  private showSuccessAndReset(message: string): void {
    this.showSuccessMessage.set(true);
    this.errorMessage.set(message);
    this.notificationService.success(message);

    const user = this.currentUser();
    const userName = this.getUserName(user);
    const userEmail = user?.email || '';
    const userPhone = this.getUserPhone(user);

    this.contactForm.reset({
      name: userName,
      email: userEmail,
      phone: userPhone,
      serviceInterest: '',
      message: '',
      urgencyLevel: 'normal',
      preferredTime: '',
      concernCategory: '',
      preferredExpertType: '',
      sessionMode: 'online_audio',
      preferredLanguage: '',
      preferredProviderGender: '',
      autoMatchProvider: true,
      safetyRisk: 'none',
      previousTherapyOrMedication: '',
      emergencyConsent: true,
      preferAnonymousTelegram: false,
      preferredContact: 'telegram',
    });
    this.clearPromoCode();
    this.selectedAppointment.set(null);

    setTimeout(() => {
      this.showSuccessMessage.set(false);
      this.errorMessage.set('');
    }, 5000);
  }

  private resolveServicePriceInPaise(serviceName: string): number {
    const serviceQuote = this.careTeamServiceQuote();
    if (serviceQuote) {
      return serviceQuote.quote.amountInPaise;
    }
    const queryPrice = Number(this.prefilledData().price);
    if (this.prefilledData().careTeamServiceId && Number.isFinite(queryPrice) && queryPrice >= 0) {
      return Math.round(queryPrice * 100);
    }
    if (Number.isFinite(queryPrice) && queryPrice > 0) {
      return Math.round(queryPrice * 100);
    }

    const service = this.services.find(
      (service) => service.name === serviceName || service.id === serviceName,
    );
    return Math.round((service?.pricing?.individual ?? 0) * 100);
  }

  private async updateProviderSuggestion(): Promise<void> {
    if (!this.contactForm || this.prefilledData().providerId) {
      this.matchedProvider.set(null);
      this.providerMatchLoading.set(false);
      this.providerMatchMessage.set('');
      return;
    }
    if (!this.contactForm.get('autoMatchProvider')?.value) {
      this.matchedProvider.set(null);
      this.providerMatchLoading.set(false);
      this.providerMatchMessage.set('Auto-match is off.');
      return;
    }

    const formValue = this.contactForm.value as ContactForm;
    const roleGroup = this.roleGroupForExpertType(formValue.preferredExpertType || '');
    const gender = formValue.preferredProviderGender || '';
    const language = formValue.preferredLanguage || '';
    const concern = formValue.concernCategory || '';

    if (!roleGroup && !gender && !language && !concern) {
      this.matchedProvider.set(null);
      this.providerMatchLoading.set(false);
      this.providerMatchMessage.set('Add preferences to auto-match a provider.');
      return;
    }

    const beforeProviderId = this.activeProviderId();
    this.providerMatchLoading.set(true);
    this.providerMatchMessage.set('');
    try {
      let res = await firstValueFrom(
        this.bookingService.providers({
          page: 1,
          pageSize: 8,
          roleGroup,
          concern,
          language,
          gender,
          autoMatchOnly: true,
        }),
      );
      if (!res.providers.length && concern) {
        res = await firstValueFrom(
          this.bookingService.providers({
            page: 1,
            pageSize: 8,
            roleGroup,
            language,
            gender,
            autoMatchOnly: true,
          }),
        );
      }
      const provider = this.pickBestProvider(res.providers, formValue);
      this.matchedProvider.set(provider);
      this.providerMatchMessage.set(
        provider ? '' : 'No exact provider match found. Our team will assign manually.',
      );
      if (beforeProviderId !== this.activeProviderId()) {
        this.selectedAppointment.set(null);
      }
    } catch {
      this.matchedProvider.set(null);
      this.providerMatchMessage.set('Could not auto-match right now. Team review will handle it.');
    } finally {
      this.providerMatchLoading.set(false);
    }
  }

  private async loadQuickTalkProviders(): Promise<void> {
    if (!this.contactForm) return;
    const formValue = this.contactForm.value as ContactForm;
    const roleGroup = this.roleGroupForExpertType(formValue.preferredExpertType || '');
    this.quickTalkLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.bookingService.quickTalkProviders({
          roleGroup,
          concern: formValue.concernCategory || '',
          language: formValue.preferredLanguage || '',
          gender: formValue.preferredProviderGender || '',
          mode: this.activeQuickTalkMode(),
        }),
      );
      this.quickTalkProviders.set(res.providers.slice(0, 3));
      this.quickTalkMessage.set(
        res.providers.length
          ? ''
          : `No one is live for ${this.requestedLiveModeLabel()} right now. You can still book a slot.`,
      );
    } catch {
      this.quickTalkProviders.set([]);
      this.quickTalkMessage.set('Could not check live providers right now.');
    } finally {
      this.quickTalkLoading.set(false);
    }
  }

  private roleGroupForExpertType(value: string): string {
    return supportPathForExpertPreference(value);
  }

  private pickBestProvider(
    providers: HopeHubProvider[],
    formValue: ContactForm,
  ): HopeHubProvider | null {
    if (!providers.length) return null;
    const concern = (formValue.concernCategory || '').toLowerCase();
    const sessionMode = (formValue.sessionMode || '').toLowerCase();
    const scored = providers.map((provider) => {
      let score = 0;
      if (
        formValue.preferredLanguage &&
        provider.languages?.includes(formValue.preferredLanguage)
      ) {
        score += 4;
      }
      if (
        formValue.preferredProviderGender &&
        formValue.preferredProviderGender !== 'PREFER_NOT_TO_SAY' &&
        provider.gender === formValue.preferredProviderGender
      ) {
        score += 4;
      }
      if (
        concern &&
        provider.concernsHandled?.some((item) => item.toLowerCase().includes(concern))
      ) {
        score += 3;
      }
      if (
        sessionMode &&
        provider.sessionTypes?.some((item) => item.toLowerCase().includes(sessionMode))
      ) {
        score += 1;
      }
      if (provider.services?.length) score += 1;
      if (provider.isClinicalCare) score += 1;
      return { provider, score };
    });
    scored.sort((a, b) => b.score - a.score || a.provider.name.localeCompare(b.provider.name));
    return scored[0]?.provider ?? null;
  }

  private applyLiveConnectPrefill(): void {
    const mode = this.normalizeLiveConnectMode(this.prefilledData().mode);
    const patch: Record<string, string> = {};
    if (mode) {
      patch['sessionMode'] = this.sessionModeForLiveConnectMode(mode);
    }
    if (this.isLiveConnectFallback() && !this.contactForm.get('serviceInterest')?.value) {
      patch['serviceInterest'] = this.prefilledData().serviceName || 'Hope Hub Consultation';
    }
    if (this.prefilledData().supportPath && !this.contactForm.get('preferredExpertType')?.value) {
      patch['preferredExpertType'] = this.prefilledData().supportPath;
    }
    if (this.prefilledData().concernCategory && !this.contactForm.get('concernCategory')?.value) {
      patch['concernCategory'] = this.prefilledData().concernCategory;
    }
    if (this.isLiveConnectFallback() && !this.contactForm.get('message')?.value) {
      patch['message'] = this.generateInitialMessage();
    }
    if (Object.keys(patch).length) {
      this.contactForm.patchValue(patch, { emitEvent: false });
    }
  }

  private initialSessionMode(): string {
    const mode = this.normalizeLiveConnectMode(this.prefilledData().mode);
    return mode ? this.sessionModeForLiveConnectMode(mode) : 'online_audio';
  }

  private initialPreferredExpertType(): string {
    return supportPathForExpertPreference(
      this.prefilledData().supportPath || this.prefilledData().preferredExpertType,
    );
  }

  private activeQuickTalkMode(): LiveConnectMode {
    const sessionMode = String(this.contactForm?.get('sessionMode')?.value || '').toLowerCase();
    if (sessionMode.includes('video')) return 'video';
    if (sessionMode.includes('chat')) return 'chat';
    return 'voice';
  }

  private quickTalkServiceForProvider(
    provider: HopeHubProvider,
  ): NonNullable<HopeHubProvider['services']>[number] | null {
    const services = provider.services || [];
    const mode = this.activeQuickTalkMode();
    const matched = services.find((service) => {
      const text = `${service.title || ''} ${service.description || ''}`.toLowerCase();
      if (mode === 'chat') return /\b(chat|message|text)\b/.test(text);
      if (mode === 'video') return /\b(video)\b/.test(text);
      return /\b(voice|audio|call)\b/.test(text);
    });
    return matched || services[0] || null;
  }

  private sessionModeForLiveConnectMode(mode: LiveConnectMode): string {
    if (mode === 'video') return 'online_video';
    if (mode === 'chat') return 'live_chat';
    return 'online_audio';
  }

  private normalizeLiveConnectMode(value: unknown): LiveConnectMode | '' {
    const raw = String(value || '').toLowerCase();
    if (raw.includes('video')) return 'video';
    if (raw.includes('voice') || raw.includes('audio')) return 'voice';
    if (raw.includes('chat') || raw.includes('message')) return 'chat';
    return '';
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private savePendingBooking(formData: ContactForm, appointment: AppointmentSlot): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      this.pendingBookingStorageKey,
      JSON.stringify({
        formData,
        appointment: {
          ...appointment,
          date: appointment.date.toISOString(),
        },
        prefilledData: this.prefilledData(),
        savedAt: new Date().toISOString(),
      }),
    );
  }

  private restorePendingBooking(): void {
    if (typeof sessionStorage === 'undefined') return;
    const raw = sessionStorage.getItem(this.pendingBookingStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        formData: ContactForm;
        appointment: { date: string; time: string; consultant?: string };
        prefilledData?: any;
        savedAt: string;
      };
      const savedAt = new Date(parsed.savedAt).getTime();
      const isFresh = Date.now() - savedAt < 60 * 60 * 1000;
      if (!isFresh) {
        this.clearPendingBooking();
        return;
      }

      this.prefilledData.set({ ...this.prefilledData(), ...(parsed.prefilledData || {}) });
      this.contactForm.patchValue(parsed.formData);
      this.selectedAppointment.set({
        ...parsed.appointment,
        date: new Date(parsed.appointment.date),
      });

      if (!this.currentUser()) {
        this.waitingForAuthToBook.set(true);
      }
    } catch {
      this.clearPendingBooking();
    }
  }

  private clearPendingBooking(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(this.pendingBookingStorageKey);
  }
}
