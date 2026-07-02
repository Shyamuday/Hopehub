import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { AdminStatsComponent } from './admin-stats.component';
import { BookConsultationPanelComponent, BookConsultationPayload } from './book-consultation-panel.component';
import { ConsultationDetailComponent, PrescriptionPayload, SendMessagePayload } from './consultation-detail.component';
import { ConsultationListComponent } from './consultation-list.component';
import { PaymentStatusOverlayComponent } from './payment-status-overlay.component';
import { PrescriptionHistoryComponent } from './prescription-history.component';
import { ReminderPreferencesComponent, ReminderPrefs } from './reminder-preferences.component';
import { TodayMedicinesComponent } from './today-medicines.component';
import { PatientProfileComponent } from './patient-profile.component';
import { ClinicApiService } from './clinic-api.service';
import { AuthService } from './auth/auth.service';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { DEFAULT_QUIET_HOURS, DEFAULT_SNOOZE_MINUTES, NOTICE_DISMISS_MS } from './core/constants/timing.constants';
import { PURCHASE_TYPES } from './core/constants/billing.constants';
import { BillingPlan, Consultation, Disease, Doctor, DoseEvent, Prescription } from './models';

type PaymentFlowState = 'IDLE' | 'CREATING_ORDER' | 'OPENING_CHECKOUT' | 'VERIFYING' | 'SUCCESS' | 'ERROR';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    AppHeaderComponent,
    AppFooterComponent,
    AdminStatsComponent,
    BookConsultationPanelComponent,
    ConsultationDetailComponent,
    ConsultationListComponent,
    PaymentStatusOverlayComponent,
    PrescriptionHistoryComponent,
    ReminderPreferencesComponent,
    TodayMedicinesComponent,
    PatientProfileComponent,
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly diseases = signal<Disease[]>([]);
  readonly billingPlans = signal<BillingPlan[]>([]);
  readonly consultations = signal<Consultation[]>([]);
  readonly doctors = signal<Doctor[]>([]);
  readonly report = signal<{ revenueInPaise: number; activeDoctors: number; consultations: unknown[] } | null>(null);
  readonly activeConsultation = signal<Consultation | null>(null);
  readonly patientPrescriptions = signal<Prescription[]>([]);
  readonly todayDoseEvents = signal<DoseEvent[]>([]);
  readonly notice = signal('');
  readonly isLoading = signal(false);
  readonly isProcessing = signal(false);
  readonly paymentFlowState = signal<PaymentFlowState>('IDLE');
  readonly paymentFlowConsultation = signal<Consultation | null>(null);
  readonly paymentFlowError = signal('');
  readonly title = computed(() => `${this.auth.user()?.role?.toLowerCase()} dashboard`);
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  private realtimeChannel?: { unsubscribe(): void };

  snoozeMinutes = DEFAULT_SNOOZE_MINUTES;
  assignment = { consultationId: '', doctorId: '' };
  doctorForm = {
    name: 'Dr. New Doctor',
    email: 'newdoctor@vitalisclinic.local',
    mobile: '',
    password: 'Password@123',
    specialty: 'Dermatology'
  };
  reminderPreferences: ReminderPrefs = {
    inApp: true,
    sms: true,
    whatsapp: false,
    push: false,
    quietHoursStart: DEFAULT_QUIET_HOURS.START,
    quietHoursEnd: DEFAULT_QUIET_HOURS.END
  };

  constructor(
    readonly auth: AuthService,
    private readonly api: ClinicApiService,
    private readonly router: Router
  ) { }

  ngOnInit() {
    this.loadBaseData();
    this.realtimeChannel = this.api.watchClinicChanges(() => this.loadConsultations());
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      void this.realtimeChannel.unsubscribe();
    }
  }

  onBooked(payload: BookConsultationPayload) {
    this.isProcessing.set(true);
    this.api
      .createConsultation({
        diseaseId: payload.diseaseId,
        intakeAnswers: payload.intakeAnswers,
        purchaseType: payload.purchaseType,
        ...(payload.purchaseType === PURCHASE_TYPES.PLAN ? { planCode: payload.planCode } : {})
      })
      .subscribe({
        next: () => {
          this.showNotice('Consultation created. Complete payment to continue.');
          this.loadConsultations();
        },
        error: (error) => {
          this.isProcessing.set(false);
          this.showNotice(error.error?.message || error.message || 'Could not create consultation.');
        },
        complete: () => this.isProcessing.set(false)
      });
  }

  pay(consultation: Consultation) {
    this.paymentFlowConsultation.set(consultation);
    this.paymentFlowError.set('');
    this.paymentFlowState.set('CREATING_ORDER');
    this.isProcessing.set(true);
    this.api.createPaymentOrder(consultation.id).subscribe({
      next: (order) => {
        this.paymentFlowState.set('OPENING_CHECKOUT');
        this.api
          .openRazorpayCheckout(consultation, order)
          .then((payment) => {
            this.paymentFlowState.set('VERIFYING');
            this.api.verifyPayment(consultation.id, payment).subscribe({
              next: () => {
                this.paymentFlowState.set('SUCCESS');
                this.showNotice('Payment verified. Admin can assign doctor now.');
                this.loadConsultations();
              },
              error: (error) => {
                this.isProcessing.set(false);
                this.paymentFlowState.set('ERROR');
                this.paymentFlowError.set(error.error?.message || error.message || 'Payment verification failed.');
                this.showNotice(this.paymentFlowError());
              },
              complete: () => this.isProcessing.set(false)
            });
          })
          .catch((error) => {
            this.isProcessing.set(false);
            this.paymentFlowState.set('ERROR');
            this.paymentFlowError.set(error.message || 'Payment was not completed.');
            this.showNotice(this.paymentFlowError());
          });
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.paymentFlowState.set('ERROR');
        this.paymentFlowError.set(error.error?.message || error.message || 'Payment failed.');
        this.showNotice(this.paymentFlowError());
      }
    });
  }

  paymentFlowTitle() {
    const state = this.paymentFlowState();
    if (state === 'CREATING_ORDER') return 'Creating secure order';
    if (state === 'OPENING_CHECKOUT') return 'Opening Razorpay checkout';
    if (state === 'VERIFYING') return 'Verifying payment';
    if (state === 'SUCCESS') return 'Payment successful';
    if (state === 'ERROR') return 'Payment failed';
    return '';
  }

  paymentFlowMessage() {
    const state = this.paymentFlowState();
    if (state === 'CREATING_ORDER') return 'Preparing your order details.';
    if (state === 'OPENING_CHECKOUT') return 'Complete payment in the Razorpay popup.';
    if (state === 'VERIFYING') return 'Please wait while we verify with the gateway.';
    if (state === 'SUCCESS') return 'Your consultation is now ready for doctor assignment.';
    if (state === 'ERROR') return this.paymentFlowError() || 'Something went wrong. Please try again.';
    return '';
  }

  retryPayment() {
    const consultation = this.paymentFlowConsultation();
    if (!consultation) return;
    this.pay(consultation);
  }

  closePaymentOverlay() {
    if (this.paymentFlowState() === 'SUCCESS' || this.paymentFlowState() === 'ERROR') {
      this.paymentFlowState.set('IDLE');
      this.paymentFlowError.set('');
      this.paymentFlowConsultation.set(null);
    }
  }

  setActive(consultation: Consultation) {
    this.activeConsultation.set(consultation);
  }

  onMessageSent(payload: SendMessagePayload) {
    this.isProcessing.set(true);
    this.api.sendMessage(payload.consultation.id, payload.body).subscribe({
      next: () => this.loadConsultations(),
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not send message.');
      },
      complete: () => this.isProcessing.set(false)
    });
  }

  onUploadPrescription(payload: PrescriptionPayload) {
    const consultation = this.activeConsultation();
    if (!consultation) return;
    this.isProcessing.set(true);
    this.api.uploadPrescription(consultation.id, payload).subscribe({
      next: () => {
        this.showNotice('Prescription uploaded.');
        this.loadConsultations();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not upload prescription.');
      },
      complete: () => this.isProcessing.set(false)
    });
  }

  onComplete() {
    const consultation = this.activeConsultation();
    if (!consultation) return;
    this.isProcessing.set(true);
    this.api.completeConsultation(consultation.id).subscribe({
      next: () => {
        this.showNotice('Consultation completed.');
        this.loadConsultations();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not complete consultation.');
      },
      complete: () => this.isProcessing.set(false)
    });
  }

  markDoseTaken(doseEventId: string) {
    this.isProcessing.set(true);
    this.api.markDoseTaken(doseEventId).subscribe({
      next: () => {
        this.showNotice('Marked as taken.');
        this.loadPatientMedicationData();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not mark dose as taken.');
      },
      complete: () => this.isProcessing.set(false)
    });
  }

  skipDose(doseEventId: string) {
    const note = prompt('Reason for skipping this dose?', '') || undefined;
    this.isProcessing.set(true);
    this.api.skipDose(doseEventId, note).subscribe({
      next: () => {
        this.showNotice('Dose skipped.');
        this.loadPatientMedicationData();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not skip dose.');
      },
      complete: () => this.isProcessing.set(false)
    });
  }

  snoozeDose(doseEventId: string) {
    this.isProcessing.set(true);
    this.api.snoozeDose(doseEventId, Number(this.snoozeMinutes) || DEFAULT_SNOOZE_MINUTES).subscribe({
      next: () => {
        this.showNotice('Dose snoozed.');
        this.loadPatientMedicationData();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not snooze dose.');
      },
      complete: () => this.isProcessing.set(false)
    });
  }

  onSavePreferences(prefs: ReminderPrefs) {
    this.isProcessing.set(true);
    this.api.saveReminderPreferences(prefs).subscribe({
      next: () => this.showNotice('Reminder preferences saved.'),
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not save reminder preferences.');
      },
      complete: () => this.isProcessing.set(false)
    });
  }

  createDoctor() {
    this.isProcessing.set(true);
    this.api.createDoctor(this.doctorForm).subscribe({
      next: () => {
        this.showNotice('Doctor created.');
        this.loadAdminData();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not create doctor.');
      },
      complete: () => this.isProcessing.set(false)
    });
  }

  assignDoctor() {
    if (!this.assignment.consultationId || !this.assignment.doctorId) {
      return this.showNotice('Select consultation and doctor.');
    }

    this.isProcessing.set(true);
    this.api.assignDoctor(this.assignment.consultationId, this.assignment.doctorId).subscribe({
      next: () => {
        this.showNotice('Doctor assigned.');
        this.loadConsultations();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not assign doctor.');
      },
      complete: () => this.isProcessing.set(false)
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl(`/${ROUTE_PATHS.LOGIN}`);
  }

  private loadBaseData() {
    this.isLoading.set(true);
    this.api.diseases().subscribe({
      next: ({ diseases }) => {
        this.diseases.set(diseases);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not load diseases.');
      }
    });
    this.api.billingPlans().subscribe({
      next: ({ plans }) => this.billingPlans.set(plans || []),
      error: () => { /* keep disease-based one-time fallback */ }
    });
    this.loadConsultations();
    if (this.auth.user()?.role === 'PATIENT') {
      this.loadPatientMedicationData();
    }
    if (this.auth.user()?.role === 'ADMIN') {
      this.loadAdminData();
    }
  }

  private loadConsultations() {
    this.api.consultations().subscribe({
      next: ({ consultations }) => {
        this.consultations.set(consultations);
        this.activeConsultation.set(
          this.activeConsultation()
            ? consultations.find((c) => c.id === this.activeConsultation()?.id) || null
            : consultations[0] || null
        );
        this.assignment.consultationId = consultations[0]?.id || this.assignment.consultationId;
      },
      error: (error) => this.showNotice(error.error?.message || error.message || 'Could not load consultations.')
    });
  }

  private loadAdminData() {
    this.api.doctors().subscribe({
      next: ({ doctors }) => {
        this.doctors.set(doctors);
        this.assignment.doctorId = doctors[0]?.id || this.assignment.doctorId;
      },
      error: (error) => this.showNotice(error.error?.message || error.message || 'Could not load doctors.')
    });
    this.api.reports().subscribe({
      next: (report) => this.report.set(report),
      error: (error) => this.showNotice(error.error?.message || error.message || 'Could not load reports.')
    });
  }

  private loadPatientMedicationData() {
    this.api.reminderPreferences().subscribe({
      next: ({ preferences }) => { this.reminderPreferences = preferences; },
      error: (error) => this.showNotice(error.error?.message || error.message || 'Could not load reminder preferences.')
    });
    this.api.patientPrescriptions().subscribe({
      next: ({ prescriptions }) => this.patientPrescriptions.set(prescriptions),
      error: (error) => this.showNotice(error.error?.message || error.message || 'Could not load prescriptions.')
    });
    this.api.todayDoseEvents().subscribe({
      next: ({ doseEvents }) => this.todayDoseEvents.set(doseEvents),
      error: (error) => this.showNotice(error.error?.message || error.message || 'Could not load today medicines.')
    });
  }

  private showNotice(message: string) {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), NOTICE_DISMISS_MS);
  }
}
