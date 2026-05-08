import { CommonModule, formatDate } from '@angular/common';
import { Component, type OnDestroy, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { AdminStatsComponent } from './admin-stats.component';
import { BookConsultationPanelComponent, type BookConsultationPayload } from './book-consultation-panel.component';
import {
  ConsultationDetailComponent,
  type PrescriptionPayload,
  type SendMessagePayload
} from './consultation-detail.component';
import { ConsultationListComponent } from './consultation-list.component';
import { PaymentStatusOverlayComponent } from './payment-status-overlay.component';
import { PrescriptionHistoryComponent } from './prescription-history.component';
import { ReminderPreferencesComponent, type ReminderPrefs } from './reminder-preferences.component';
import { TodayMedicinesComponent } from './today-medicines.component';
import { PatientProfileComponent } from './patient-profile.component';
import { buildPatientWhatsAppLink } from './patient/patient-whatsapp';
import {
  clearWorksheetBookingDraft,
  readWorksheetBookingDraft,
  type WorksheetBookingDraft
} from './patient/patient-worksheet-booking-bridge';
import { ClinicApiService } from './clinic-api/clinic-api.service';
import { AuthService } from './auth/auth.service';
import { adminHasAllPermissions, ADMIN_PERMISSIONS } from './auth/staff-permissions';
import type { BillingPlan, ClinicLocation, Consultation, Disease, Doctor, DoseEvent, Prescription } from './interfaces';
import { environment } from '../environments/environment';

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
    RouterLink,
    TranslatePipe
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly adminPerm = ADMIN_PERMISSIONS;
  readonly doctorPortalUrl = environment.doctorPortalUrl || '';
  readonly patientXp = environment.patientExperience;
  readonly whatsappLink = buildPatientWhatsAppLink(
    this.patientXp.whatsappE164,
    this.patientXp.whatsappMessage
  );
  readonly diseases = signal<Disease[]>([]);
  readonly clinicLocations = signal<ClinicLocation[]>([]);
  readonly billingPlans = signal<BillingPlan[]>([]);
  readonly consultations = signal<Consultation[]>([]);
  readonly doctors = signal<Doctor[]>([]);
  readonly report = signal<{ revenueInPaise: number; activeDoctors: number; consultations: unknown[] } | null>(null);
  readonly activeConsultation = signal<Consultation | null>(null);
  readonly patientPrescriptions = signal<Prescription[]>([]);
  readonly todayDoseEvents = signal<DoseEvent[]>([]);
  /** Patient: prefill consultation chat from Today’s Medicines (“Question or side effect”). */
  readonly patientChatCompose = signal<{ token: number; text: string }>({ token: 0, text: '' });
  readonly notice = signal('');
  readonly isLoading = signal(false);
  readonly isProcessing = signal(false);
  readonly paymentFlowState = signal<PaymentFlowState>('IDLE');
  readonly paymentFlowConsultation = signal<Consultation | null>(null);
  readonly paymentFlowError = signal('');
  readonly headerSubtitle = signal('');
  readonly worksheetBookingDraft = signal<WorksheetBookingDraft | null>(null);
  private realtimeChannel?: RealtimeChannel;

  snoozeMinutes = 15;
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
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00'
  };

  constructor(
    readonly auth: AuthService,
    private readonly api: ClinicApiService,
    private readonly router: Router,
    private readonly translate: TranslateService
  ) {
    this.translate.onLangChange.subscribe(() => this.refreshHeaderSubtitle());
  }

  private refreshHeaderSubtitle() {
    const r = this.auth.user()?.role;
    if (!r) {
      this.headerSubtitle.set('');
      return;
    }
    this.headerSubtitle.set(this.translate.instant(`dashboard.subtitle.${r}`));
  }

  canAdmin(...codes: string[]) {
    return adminHasAllPermissions(this.auth.user(), ...codes);
  }

  ngOnInit() {
    this.refreshHeaderSubtitle();
    if (this.auth.user()?.role === 'PATIENT') {
      this.worksheetBookingDraft.set(readWorksheetBookingDraft());
    }
    this.loadBaseData();
    this.realtimeChannel = this.api.watchClinicChanges(() => this.loadConsultations());
  }

  onWorksheetDraftDismissed() {
    clearWorksheetBookingDraft();
    this.worksheetBookingDraft.set(null);
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
        channel: payload.channel,
        locationId: payload.locationId,
        ...(payload.purchaseType === 'PLAN' ? { planCode: payload.planCode } : {})
      })
      .subscribe({
        next: () => {
          clearWorksheetBookingDraft();
          this.worksheetBookingDraft.set(null);
          this.showNotice(this.translate.instant('notice.consultationCreated'));
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
                this.showNotice(this.translate.instant('notice.paymentVerified'));
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
    const t = this.translate.instant.bind(this.translate);
    if (state === 'CREATING_ORDER') return t('patient.payment.titleCreating');
    if (state === 'OPENING_CHECKOUT') return t('patient.payment.titleCheckout');
    if (state === 'VERIFYING') return t('patient.payment.titleVerifying');
    if (state === 'SUCCESS') return t('patient.payment.titleSuccess');
    if (state === 'ERROR') return t('patient.payment.titleError');
    return '';
  }

  paymentFlowMessage() {
    const state = this.paymentFlowState();
    const t = this.translate.instant.bind(this.translate);
    if (state === 'CREATING_ORDER') return t('patient.payment.msgCreating');
    if (state === 'OPENING_CHECKOUT') return t('patient.payment.msgCheckout');
    if (state === 'VERIFYING') return t('patient.payment.msgVerifying');
    if (state === 'SUCCESS') {
      return t('patient.payment.msgSuccess');
    }
    if (state === 'ERROR') {
      return this.paymentFlowError() || t('patient.payment.msgErrorGeneric');
    }
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
    const note = prompt(this.translate.instant('notice.skipDosePrompt'), '') || undefined;
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
    this.api.snoozeDose(doseEventId, Number(this.snoozeMinutes) || 15).subscribe({
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

  onDoseDoctorMessage(dose: DoseEvent) {
    const cid = dose.consultationId;
    if (!cid) {
      this.showNotice('This reminder is not linked to a consultation. Use the chat on your active case or book a follow-up.');
      return;
    }
    const c = this.consultations().find((x) => x.id === cid);
    if (!c) {
      this.showNotice('Could not find this consultation. Try again after the list loads.');
      return;
    }
    this.setActive(c);
    const when = formatDate(dose.scheduledFor, 'medium', 'en-IN');
    const rx = dose.prescriptionItem;
    const summary = [rx.medicineName, rx.strength, rx.dose, rx.frequency].filter(Boolean).join(' · ');
    const text = `[Medicine / dose: ${summary} — scheduled ${when}, status: ${dose.status}]\n\n`;
    this.patientChatCompose.update((prev) => ({ token: prev.token + 1, text }));
    this.showNotice(this.translate.instant('notice.draftChatAdded'));
  }

  onSavePreferences(prefs: ReminderPrefs) {
    this.isProcessing.set(true);
    this.api.saveReminderPreferences(prefs).subscribe({
      next: () => this.showNotice(this.translate.instant('notice.reminderSaved')),
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
    this.router.navigateByUrl('/login');
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
    if (this.auth.user()?.role === 'PATIENT') {
      this.api.clinicLocations().subscribe({
        next: ({ locations }) => this.clinicLocations.set(locations || []),
        error: () => this.clinicLocations.set([])
      });
    }
    this.loadConsultations();
    if (this.auth.user()?.role === 'PATIENT') {
      this.loadPatientMedicationData();
    }
    if (this.auth.user()?.role === 'ADMIN') {
      this.loadAdminData();
    }
  }

  loadConsultations() {
    const user = this.auth.user();
    if (user?.role === 'ADMIN' && !adminHasAllPermissions(user, ADMIN_PERMISSIONS.CONSULTATIONS_READ)) {
      this.consultations.set([]);
      this.activeConsultation.set(null);
      return;
    }
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
    const user = this.auth.user();
    if (adminHasAllPermissions(user, ADMIN_PERMISSIONS.DOCTORS_READ)) {
      this.api.doctors().subscribe({
        next: ({ doctors }) => {
          this.doctors.set(doctors);
          this.assignment.doctorId = doctors[0]?.id || this.assignment.doctorId;
        },
        error: (error) => this.showNotice(error.error?.message || error.message || 'Could not load doctors.')
      });
    } else {
      this.doctors.set([]);
    }
    if (adminHasAllPermissions(user, ADMIN_PERMISSIONS.REPORTS_VIEW)) {
      this.api.reports().subscribe({
        next: (report) => this.report.set(report),
        error: (error) => this.showNotice(error.error?.message || error.message || 'Could not load reports.')
      });
    } else {
      this.report.set(null);
    }
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
    setTimeout(() => this.notice.set(''), 3500);
  }
}
