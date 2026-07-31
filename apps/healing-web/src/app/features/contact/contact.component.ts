import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { ContactForm } from '../../core/models/contact.model';
import {
  LeadService,
  LoadingService,
  AuthService,
  AuthModalService,
  BookingService,
  PaymentService,
  NotificationService,
} from '../../core/services';
import { APP_CONSTANTS } from '../../core';
import { FEATURED_SERVICES, getAllServices } from '../../core/data/services-data';
import type { HopeHubOffering } from '../../core/services/booking.service';
import {
  AppointmentCalendarComponent,
  AppointmentSlot,
  FormDropdownComponent,
  FormDropdownOption,
  PaymentFlowState,
  PaymentStatusOverlayComponent,
} from '../../shared/components';
import { User } from '../../core/models/auth.model';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    AppointmentCalendarComponent,
    FormDropdownComponent,
    PaymentStatusOverlayComponent,
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent implements OnInit {
  APP_CONSTANTS = APP_CONSTANTS;
  readonly notes = NOTE_CONTENT;
  private readonly pendingBookingStorageKey = 'hope_hub_pending_booking';

  private formBuilder = inject(FormBuilder);
  private leadService = inject(LeadService);
  private loadingService = inject(LoadingService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);
  private bookingService = inject(BookingService);
  private paymentService = inject(PaymentService);
  private notificationService = inject(NotificationService);

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
  currentUser = signal<User | null>(null);
  services = getAllServices();
  serviceOptions: FormDropdownOption[] = [
    { value: '', label: 'Select a service (optional)' },
    ...this.services.map((service) => ({ value: service.name, label: service.name })),
  ];
  urgencyOptions: FormDropdownOption[] = [
    { value: 'low', label: 'Low - I can wait a few days' },
    { value: 'normal', label: 'Normal - Please respond within 24 hours' },
    { value: 'high', label: 'High - I need support soon' },
  ];
  concernCategoryOptions: FormDropdownOption[] = [
    { value: '', label: 'Select concern category' },
    { value: 'Anxiety', label: 'Anxiety' },
    { value: 'Stress', label: 'Stress' },
    { value: 'Relationship concerns', label: 'Relationship concerns' },
    { value: 'Family concerns', label: 'Family concerns' },
    { value: 'Child or teen support', label: 'Child or teen support' },
    { value: 'Career or life guidance', label: 'Career or life guidance' },
    { value: 'Other', label: 'Other' },
  ];
  expertTypeOptions: FormDropdownOption[] = [
    { value: '', label: 'No preference' },
    { value: 'Psychologist', label: 'Psychologist' },
    { value: 'Counsellor', label: 'Counsellor' },
    { value: 'Psychotherapist', label: 'Psychotherapist' },
    { value: 'Mental wellness expert', label: 'Mental wellness expert' },
  ];
  sessionModeOptions: FormDropdownOption[] = [
    { value: 'online_audio', label: 'Online audio' },
    { value: 'online_video', label: 'Online video' },
    { value: 'chat_followup', label: 'Chat follow-up' },
  ];
  languageOptions: FormDropdownOption[] = [
    { value: '', label: 'No preference' },
    { value: 'English', label: 'English' },
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Bengali', label: 'Bengali' },
    { value: 'Tamil', label: 'Tamil' },
    { value: 'Telugu', label: 'Telugu' },
  ];
  safetyRiskOptions: FormDropdownOption[] = [
    { value: 'none', label: 'No immediate safety risk' },
    { value: 'unsure', label: 'Not sure / prefer to discuss' },
    { value: 'urgent', label: 'Urgent safety concern' },
  ];

  constructor() {
    this.readQueryParameters();
    this.loadUserData();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.restorePendingBooking();
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
    });
  }

  private readQueryParameters(): void {
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params: any) => {
      this.prefilledData.set({
        service: params['service'] || '',
        serviceName: params['serviceName'] || '',
        consultant: params['consultant'] || '',
        providerId: params['providerId'] || '',
        consultantPhone: params['consultantPhone'] || '',
        duration: params['duration'] || '',
        price: params['price'] || '',
        offering: params['offering'] || '',
        offeringId: params['offeringId'] || '',
        paymentMode: params['paymentMode'] || 'FULL',
        source: params['source'] || '',
      });
      this.loadSelectedOffering(params);
    });
  }

  private loadSelectedOffering(params: any): void {
    const offeringKey = params['offering'] || params['offeringId'] || '';
    if (!offeringKey) {
      this.selectedOffering.set(null);
      return;
    }

    this.bookingService.offering(offeringKey).subscribe({
      next: ({ offering }) => this.selectedOffering.set(offering),
      error: () => this.selectedOffering.set(null),
    });
  }

  private initializeForm(): void {
    // Determine initial service value and message
    const initialServiceValue =
      this.prefilledData().serviceName || this.prefilledData().service || '';
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
      preferredExpertType: [''],
      sessionMode: ['online_audio'],
      preferredLanguage: [''],
      safetyRisk: ['none'],
      previousTherapyOrMedication: [''],
      emergencyConsent: [true],
      preferAnonymousTelegram: [false],
      message: [initialMessage],
      preferredContact: ['telegram', [Validators.required]],
    });
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
    if (data.serviceName && data.consultant) {
      let message = `Interested in ${data.serviceName}`;

      if (data.consultant) {
        message += ` with ${data.consultant}`;
      }

      if (data.duration) {
        message += ` (${data.duration} session)`;
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
    console.log('Appointment selected:', appointment);
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
      this.authModalService.openRegister();
      throw new Error('Sign up or log in to continue to secure payment.');
    }

    const data = this.prefilledData();
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
          offeringId: data.offeringId || '',
          offeringSlug: data.offering || '',
          paymentMode: data.paymentMode === 'PARTIAL' ? 'PARTIAL' : 'FULL',
          message: bookingMessage,
          appointmentDate: this.formatLocalDate(appointment.date),
          appointmentTime: appointment.time,
          consultantName: data.consultant || appointment.consultant || '',
          consultantPhone: data.consultantPhone || '',
          providerId: data.providerId || '',
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
          safetyRisk: (formData as any).safetyRisk || '',
          previousTherapyOrMedication: (formData as any).previousTherapyOrMedication || '',
          emergencyConsent: Boolean((formData as any).emergencyConsent),
          preferAnonymousTelegram: Boolean(formData.preferAnonymousTelegram),
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
        })
        .subscribe({ next: resolve, error: reject });
    });

    this.paymentFlowConsultation.set(response.consultation);
    this.paymentFlowError.set('');
    this.paymentFlowState.set('CREATING_ORDER');
    await this.paymentService.payConsultation(response.consultation, {
      onOrderCreated: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
      onCheckoutOpened: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
      onVerifying: () => this.paymentFlowState.set('VERIFYING'),
    });
    this.paymentFlowState.set('SUCCESS');
    this.clearPendingBooking();
    this.showSuccessAndReset('Appointment booked and payment verified successfully.');
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
        : 'Book a session';
    }
    return this.prefilledData().paymentMode === 'PARTIAL' ? 'Book and pay deposit' : 'Book and pay';
  }

  offerDiscountInPaise(): number {
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
    const offer = this.selectedOffering();
    if (!offer?.priceInPaise)
      return this.resolveServicePriceInPaise(this.contactForm?.get('serviceInterest')?.value || '');
    return Math.max(0, offer.priceInPaise - this.offerDiscountInPaise());
  }

  payTodayInPaise(): number {
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

  balanceDueInPaise(): number {
    return Math.max(0, this.offerFinalInPaise() - this.payTodayInPaise());
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
      safetyRisk: 'none',
      previousTherapyOrMedication: '',
      emergencyConsent: true,
      preferAnonymousTelegram: false,
      preferredContact: 'telegram',
    });
    this.selectedAppointment.set(null);

    setTimeout(() => {
      this.showSuccessMessage.set(false);
      this.errorMessage.set('');
    }, 5000);
  }

  private resolveServicePriceInPaise(serviceName: string): number {
    const queryPrice = Number(this.prefilledData().price);
    if (Number.isFinite(queryPrice) && queryPrice > 0) {
      return Math.round(queryPrice * 100);
    }

    const featured = FEATURED_SERVICES.find(
      (service) => service.name === serviceName || service.id === serviceName,
    );
    return Math.round((featured?.price ?? 500) * 100);
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
