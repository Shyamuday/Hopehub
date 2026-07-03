import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { RoleTaskGuideComponent } from '@vitalis/platform-ui';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { AdminStatsComponent } from './admin-stats.component';
import {
  BookConsultationPanelComponent,
  BookConsultationPayload,
} from './book-consultation-panel.component';
import {
  ConsultationDetailComponent,
  PrescriptionPayload,
  SendMessagePayload,
} from './consultation-detail.component';
import { ConsultationListComponent } from './consultation-list.component';
import { PaymentStatusOverlayComponent } from './payment-status-overlay.component';
import { PrescriptionHistoryComponent } from './prescription-history.component';
import { LabResultsComponent } from './lab-results.component';
import { ReminderPreferencesComponent, ReminderPrefs } from './reminder-preferences.component';
import { TodayMedicinesComponent } from './today-medicines.component';
import { PatientProfileComponent } from './patient-profile.component';
import { ClinicApiService } from './clinic-api.service';
import { DashboardDataService, DashboardPaymentService } from './dashboard-data.service';
import { AuthService } from './auth/auth.service';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import {
  DEFAULT_QUIET_HOURS,
  DEFAULT_SNOOZE_MINUTES,
  NOTICE_DISMISS_MS,
} from './core/constants/timing.constants';
import { PURCHASE_TYPES } from './core/constants/billing.constants';
import {
  BillingPlan,
  Consultation,
  Disease,
  DoseEvent,
  Doctor,
  LabResult,
  Prescription,
} from './models';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormField,
    AppHeaderComponent,
    AppFooterComponent,
    AdminStatsComponent,
    BookConsultationPanelComponent,
    ConsultationDetailComponent,
    ConsultationListComponent,
    PaymentStatusOverlayComponent,
    PrescriptionHistoryComponent,
    LabResultsComponent,
    ReminderPreferencesComponent,
    TodayMedicinesComponent,
    PatientProfileComponent,
    RoleTaskGuideComponent,
  ]
,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ClinicApiService);
  private readonly dataService = inject(DashboardDataService);
  readonly paymentService = inject(DashboardPaymentService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly diseases = signal<Disease[]>([]);
  readonly billingPlans = signal<BillingPlan[]>([]);
  readonly consultations = signal<Consultation[]>([]);
  readonly doctors = signal<Doctor[]>([]);
  readonly report = signal<{
    revenueInPaise: number;
    activeDoctors: number;
    consultations: unknown[];
  } | null>(null);
  readonly activeConsultation = signal<Consultation | null>(null);
  readonly patientPrescriptions = signal<Prescription[]>([]);
  readonly patientLabResults = signal<LabResult[]>([]);
  readonly todayDoseEvents = signal<DoseEvent[]>([]);
  readonly dosesNeedingReason = signal<DoseEvent[]>([]);
  readonly notice = signal('');
  readonly isLoading = signal(false);
  readonly isProcessing = signal(false);
  readonly title = computed(() => `${this.auth.user()?.role?.toLowerCase()} dashboard`);
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  private realtimeChannel?: { unsubscribe(): void };

  readonly snoozeMinutes = signal(DEFAULT_SNOOZE_MINUTES);

  readonly doctorFormModel = signal({
    name: 'Dr. New Doctor',
    email: 'newdoctor@vitalisclinic.local',
    mobile: '',
    password: 'Password@123',
    specialty: 'Dermatology',
  });
  readonly doctorForm = form(this.doctorFormModel);

  readonly assignmentModel = signal({ consultationId: '', doctorId: '' });
  readonly assignmentForm = form(this.assignmentModel);

  reminderPreferences: ReminderPrefs = {
    inApp: true,
    sms: true,
    whatsapp: false,
    push: false,
    quietHoursStart: DEFAULT_QUIET_HOURS.START,
    quietHoursEnd: DEFAULT_QUIET_HOURS.END,
  };

  paymentFlowState() {
    return this.paymentService.paymentFlowState();
  }

  paymentFlowConsultation() {
    return this.paymentService.paymentFlowConsultation();
  }

  ngOnInit() {
    this.loadBaseData();
    this.realtimeChannel = this.dataService.watchChanges(() => this.loadConsultations());
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
        ...(payload.purchaseType === PURCHASE_TYPES.PLAN ? { planCode: payload.planCode } : {}),
      })
      .subscribe({
        next: () => {
          this.showNotice('Consultation created. Complete payment to continue.');
          this.loadConsultations();
        },
        error: (error) => {
          this.isProcessing.set(false);
          this.showNotice(
            error.error?.message || error.message || 'Could not create consultation.',
          );
        },
        complete: () => this.isProcessing.set(false),
      });
  }

  pay(consultation: Consultation) {
    this.paymentService.pay(
      consultation,
      () => {
        this.showNotice('Payment verified. Admin can assign doctor now.');
        this.loadConsultations();
      },
      (message) => this.showNotice(message),
      (processing) => this.isProcessing.set(processing),
    );
  }

  paymentFlowTitle() {
    return this.paymentService.paymentFlowTitle();
  }

  paymentFlowMessage() {
    return this.paymentService.paymentFlowMessage();
  }

  retryPayment() {
    this.paymentService.retryPayment(
      () => {
        this.showNotice('Payment verified. Admin can assign doctor now.');
        this.loadConsultations();
      },
      (message) => this.showNotice(message),
      (processing) => this.isProcessing.set(processing),
    );
  }

  closePaymentOverlay() {
    this.paymentService.closePaymentOverlay();
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
      complete: () => this.isProcessing.set(false),
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
      complete: () => this.isProcessing.set(false),
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
        this.showNotice(
          error.error?.message || error.message || 'Could not complete consultation.',
        );
      },
      complete: () => this.isProcessing.set(false),
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
      complete: () => this.isProcessing.set(false),
    });
  }

  skipDose(payload: { id: string; note: string }) {
    this.isProcessing.set(true);
    this.api.skipDose(payload.id, payload.note).subscribe({
      next: () => {
        this.showNotice('Dose skipped with reason saved.');
        this.loadPatientMedicationData();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not skip dose.');
      },
      complete: () => this.isProcessing.set(false),
    });
  }

  snoozeDose(payload: { id: string; minutes: number }) {
    this.isProcessing.set(true);
    this.api.snoozeDose(payload.id, payload.minutes).subscribe({
      next: () => {
        this.showNotice(`Dose snoozed by ${payload.minutes} minutes.`);
        this.loadPatientMedicationData();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not snooze dose.');
      },
      complete: () => this.isProcessing.set(false),
    });
  }

  explainDose(payload: { id: string; note: string }) {
    this.isProcessing.set(true);
    this.api.explainDose(payload.id, payload.note).subscribe({
      next: () => {
        this.showNotice('Reason saved for your doctor.');
        this.loadPatientMedicationData();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not save reason.');
      },
      complete: () => this.isProcessing.set(false),
    });
  }

  onSavePreferences(prefs: ReminderPrefs) {
    this.isProcessing.set(true);
    this.api.saveReminderPreferences(prefs).subscribe({
      next: () => this.showNotice('Reminder preferences saved.'),
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(
          error.error?.message || error.message || 'Could not save reminder preferences.',
        );
      },
      complete: () => this.isProcessing.set(false),
    });
  }

  createDoctor() {
    this.isProcessing.set(true);
    this.api.createDoctor(this.doctorFormModel()).subscribe({
      next: () => {
        this.showNotice('Doctor created.');
        this.loadAdminData();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not create doctor.');
      },
      complete: () => this.isProcessing.set(false),
    });
  }

  assignDoctor() {
    const assignment = this.assignmentModel();
    if (!assignment.consultationId || !assignment.doctorId) {
      return this.showNotice('Select consultation and doctor.');
    }

    this.isProcessing.set(true);
    this.api.assignDoctor(assignment.consultationId, assignment.doctorId).subscribe({
      next: () => {
        this.showNotice('Doctor assigned.');
        this.loadConsultations();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not assign doctor.');
      },
      complete: () => this.isProcessing.set(false),
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl(`/${ROUTE_PATHS.LOGIN}`);
  }

  private loadBaseData() {
    this.isLoading.set(true);
    this.dataService.loadDiseases().subscribe({
      next: ({ diseases }) => {
        this.diseases.set(diseases);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not load diseases.');
      },
    });
    this.dataService.loadBillingPlans().subscribe({
      next: ({ plans }) => this.billingPlans.set(plans || []),
      error: () => {
        /* keep disease-based one-time fallback */
      },
    });
    this.loadConsultations();
    if (this.dataService.isPatient()) {
      this.loadPatientMedicationData();
    }
    if (this.dataService.isAdmin()) {
      this.loadAdminData();
    }
  }

  private loadConsultations() {
    this.dataService.loadConsultations().subscribe({
      next: ({ consultations }) => {
        this.consultations.set(consultations);
        this.activeConsultation.set(
          this.activeConsultation()
            ? consultations.find((c) => c.id === this.activeConsultation()?.id) || null
            : consultations[0] || null,
        );
        const current = this.assignmentModel();
        this.assignmentModel.set({
          consultationId: consultations[0]?.id || current.consultationId,
          doctorId: current.doctorId,
        });
      },
      error: (error) =>
        this.showNotice(error.error?.message || error.message || 'Could not load consultations.'),
    });
  }

  private loadAdminData() {
    this.dataService.loadDoctors().subscribe({
      next: ({ doctors }) => {
        this.doctors.set(doctors);
        const current = this.assignmentModel();
        this.assignmentModel.set({
          consultationId: current.consultationId,
          doctorId: doctors[0]?.id || current.doctorId,
        });
      },
      error: (error) =>
        this.showNotice(error.error?.message || error.message || 'Could not load doctors.'),
    });
    this.dataService.loadReports().subscribe({
      next: (report) => this.report.set(report),
      error: (error) =>
        this.showNotice(error.error?.message || error.message || 'Could not load reports.'),
    });
  }

  private loadPatientMedicationData() {
    this.dataService.loadReminderPreferences().subscribe({
      next: ({ preferences }) => {
        this.reminderPreferences = preferences;
      },
      error: (error) =>
        this.showNotice(
          error.error?.message || error.message || 'Could not load reminder preferences.',
        ),
    });
    this.dataService.loadPatientPrescriptions().subscribe({
      next: ({ prescriptions }) => this.patientPrescriptions.set(prescriptions),
      error: (error) =>
        this.showNotice(error.error?.message || error.message || 'Could not load prescriptions.'),
    });
    this.dataService.loadPatientLabResults().subscribe({
      next: ({ referrals }) => this.patientLabResults.set(referrals),
      error: (error) =>
        this.showNotice(error.error?.message || error.message || 'Could not load lab results.'),
    });
    this.dataService.loadMedicineReminders().subscribe({
      next: ({ today, needingReason }) => {
        this.todayDoseEvents.set(today);
        this.dosesNeedingReason.set(needingReason);
      },
      error: (error) =>
        this.showNotice(
          error.error?.message || error.message || 'Could not load medicine reminders.',
        ),
    });
  }

  private showNotice(message: string) {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), NOTICE_DISMISS_MS);
  }
}
