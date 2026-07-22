import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RoleTaskGuideComponent } from '@hopehub/platform-ui';
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
// App download QR hidden for now. Keep component available for later relaunch.
// import { AppDownloadQrComponent } from './shared/app-download-qr/app-download-qr.component';
import { ClinicApiService } from './clinic-api.service';
import { DashboardDataService, DashboardPaymentService } from './dashboard-data.service';
import { AuthService } from './auth/auth.service';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import { NativePermissionsService } from './core/services/native-permissions.service';
import type { CallMode, MediaAccessResult } from '@hopehub/platform-ui';
import { CURRENCY_CODE, PURCHASE_TYPES } from './core/constants/billing.constants';
import {
  DEFAULT_QUIET_HOURS,
  DEFAULT_SNOOZE_MINUTES,
  NOTICE_DISMISS_MS,
} from './core/constants/timing.constants';
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
    // AppDownloadQrComponent,
    RouterLink,
    RoleTaskGuideComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ClinicApiService);
  private readonly dataService = inject(DashboardDataService);
  readonly paymentService = inject(DashboardPaymentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  private pendingConsultationId: string | null = null;
  private pendingDiseaseId: string | null = null;
  private pendingClinicStoreId: string | null = null;

  readonly diseases = signal<Disease[]>([]);
  readonly selectedClinicStoreId = signal('');
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
  readonly historyDoseEvents = signal<DoseEvent[]>([]);
  readonly historyDosesLoading = signal(false);
  readonly dosesNeedingReason = signal<DoseEvent[]>([]);
  readonly notice = signal('');
  readonly isLoading = signal(false);
  readonly isProcessing = signal(false);
  readonly title = computed(() => `${this.auth.user()?.role?.toLowerCase()} dashboard`);
  private readonly whatsappSvc = inject(WhatsappLinkService);
  private readonly nativePermissions = inject(NativePermissionsService);
  readonly whatsappLink = this.whatsappSvc.url;
  readonly currencyCode = CURRENCY_CODE;
  readonly heroDisease = computed(() => {
    const id = this.pendingDiseaseIdValue();
    if (!id) return null;
    return this.diseases().find((disease) => disease.id === id) ?? null;
  });
  protected realtimeChannel?: { unsubscribe(): void; socket?: import('socket.io-client').Socket };
  readonly iceServers = signal<
    Array<{ urls: string | string[]; username?: string; credential?: string }>
  >([{ urls: 'stun:stun.l.google.com:19302' }]);
  readonly ensureMediaAccess = (mode: CallMode): Promise<MediaAccessResult> =>
    mode === 'video'
      ? this.nativePermissions.ensureVideoCallPermissions()
      : this.nativePermissions.ensureVoiceCallPermissions();

  readonly snoozeMinutes = signal(DEFAULT_SNOOZE_MINUTES);
  readonly walletBalanceInPaise = signal(0);
  private activeConsultationSocketId: string | null = null;

  readonly doctorFormModel = signal({
    name: 'Dr. New Doctor',
    email: 'newdoctor@hopehubclinic.local',
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
    this.pendingConsultationId = this.route.snapshot.queryParamMap.get('consultationId');
    this.pendingDiseaseId = this.route.snapshot.queryParamMap.get('diseaseId');
    // Offline clinic/location selection hidden for now. Platform is online-only.
    // this.pendingClinicStoreId = this.route.snapshot.queryParamMap.get('clinicStoreId');
    this.route.queryParamMap.subscribe((params) => {
      this.pendingConsultationId = params.get('consultationId');
      this.pendingDiseaseId = params.get('diseaseId');
      // const clinicStoreId = params.get('clinicStoreId');
      if (params.get('bookFollowUp')) {
        this.showNotice('Book your follow-up consultation below.');
      }
      // Offline clinic/location selection hidden for now. Platform is online-only.
      // if (clinicStoreId !== this.pendingClinicStoreId) {
      //   this.pendingClinicStoreId = clinicStoreId;
      //   if (clinicStoreId) {
      //     this.selectedClinicStoreId.set(clinicStoreId);
      //     this.reloadDiseases(clinicStoreId);
      //   }
      // }
      this.applyPendingConsultation();
    });
    void this.bootstrap();
    this.realtimeChannel = this.dataService.watchChanges(() => this.loadConsultations());
    this.api.fetchIceServers().subscribe({
      next: ({ iceServers }) => this.iceServers.set(iceServers),
      error: () => undefined,
    });
  }

  private async bootstrap() {
    // Offline clinic/location selection hidden for now. Platform is online-only.
    // const clinicStoreId = await this.resolveClinicStoreId();
    // if (clinicStoreId) {
    //   this.selectedClinicStoreId.set(clinicStoreId);
    // }
    this.loadBaseData();
  }

  private async resolveClinicStoreId(): Promise<string | null> {
    if (this.pendingClinicStoreId) {
      return this.pendingClinicStoreId;
    }

    if (typeof sessionStorage !== 'undefined') {
      const pending = sessionStorage.getItem('pendingClinicStoreId');
      if (pending) {
        sessionStorage.removeItem('pendingClinicStoreId');
        return pending;
      }
    }

    try {
      return await firstValueFrom(this.dataService.loadPatientHomeClinicStoreId());
    } catch {
      return null;
    }
  }

  onClinicStoreChange(clinicStoreId: string) {
    this.selectedClinicStoreId.set(clinicStoreId);
    this.reloadDiseases(clinicStoreId || undefined);
  }

  pendingDiseaseIdValue() {
    if (this.pendingDiseaseId) return this.pendingDiseaseId;
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('pendingDiseaseId') || '';
    }
    return '';
  }

  private applyPendingConsultation() {
    if (!this.pendingConsultationId) return;
    const match = this.consultations().find((c) => c.id === this.pendingConsultationId);
    if (match) {
      this.activeConsultation.set(match);
    }
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      void this.realtimeChannel.unsubscribe();
    }
  }

  onBooked(payload: BookConsultationPayload) {
    this.isProcessing.set(true);
    let paymentStarted = false;
    this.api
      .createConsultation({
        diseaseId: payload.diseaseId,
        intakeAnswers: payload.intakeAnswers,
        purchaseType: payload.purchaseType,
        ...(payload.purchaseType === PURCHASE_TYPES.PLAN ? { planCode: payload.planCode } : {}),
        ...(payload.walletRedeemInPaise
          ? { walletRedeemInPaise: payload.walletRedeemInPaise }
          : {}),
        ...(payload.promoCode ? { promoCode: payload.promoCode } : {}),
        // Offline clinic/location selection hidden for now. Platform is online-only.
        // ...(payload.clinicStoreId !== undefined ? { clinicStoreId: payload.clinicStoreId } : {}),
      })
      .subscribe({
        next: ({ consultation }) => {
          this.activeConsultation.set(consultation);
          this.pendingConsultationId = consultation.id;
          this.showNotice('Consultation created. Opening secure payment.');
          this.loadConsultations();
          if (consultation.status === 'PAYMENT_PENDING') {
            paymentStarted = true;
            this.pay(consultation);
          }
        },
        error: (error) => {
          this.isProcessing.set(false);
          this.showNotice(
            error.error?.message || error.message || 'Could not create consultation.',
          );
        },
        complete: () => {
          if (!paymentStarted) {
            this.isProcessing.set(false);
          }
        },
      });
  }

  pay(consultation: Consultation) {
    this.paymentService.pay(
      consultation,
      () => {
        this.showNotice('Payment verified. Expert assignment can begin now.');
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
        this.showNotice('Payment verified. Expert assignment can begin now.');
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
    this.subscribeToActiveConsultation(consultation.id);
  }

  formatInr(paise: number) {
    return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  }

  private subscribeToActiveConsultation(consultationId: string) {
    const socket = this.realtimeChannel?.socket;
    if (!socket || this.activeConsultationSocketId === consultationId) return;
    this.api.subscribeToConsultation(socket, consultationId);
    this.activeConsultationSocketId = consultationId;
  }

  private loadWalletBalance() {
    this.api.patientRewards().subscribe({
      next: ({ balanceInPaise }) => this.walletBalanceInPaise.set(balanceInPaise ?? 0),
      error: () => {
        /* wallet optional */
      },
    });
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
        this.showNotice('Reason saved for your expert.');
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
        this.showNotice('Expert created.');
        this.loadAdminData();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not create expert.');
      },
      complete: () => this.isProcessing.set(false),
    });
  }

  assignDoctor() {
    const assignment = this.assignmentModel();
    if (!assignment.consultationId || !assignment.doctorId) {
      return this.showNotice('Select consultation and expert.');
    }

    this.isProcessing.set(true);
    this.api.assignDoctor(assignment.consultationId, assignment.doctorId).subscribe({
      next: () => {
        this.showNotice('Expert assigned.');
        this.loadConsultations();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not assign expert.');
      },
      complete: () => this.isProcessing.set(false),
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl(`/${ROUTE_PATHS.LOGIN}`);
  }

  private loadBaseData(clinicStoreId?: string) {
    this.isLoading.set(true);
    this.reloadDiseases(clinicStoreId);
    this.dataService.loadBillingPlans().subscribe({
      next: ({ plans }) => this.billingPlans.set(plans || []),
      error: () => {
        /* keep disease-based one-time fallback */
      },
    });
    this.loadConsultations();
    if (this.dataService.isPatient()) {
      this.loadPatientMedicationData();
      this.loadWalletBalance();
    }
    if (this.dataService.isAdmin()) {
      this.loadAdminData();
    }
  }

  private reloadDiseases(clinicStoreId?: string) {
    this.dataService.loadDiseases({ clinicStoreId: clinicStoreId || null }).subscribe({
      next: ({ diseases }) => {
        this.diseases.set(diseases);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not load diseases.');
      },
    });
  }

  private loadConsultations() {
    this.dataService.loadConsultations().subscribe({
      next: ({ consultations }) => {
        this.consultations.set(consultations);
        const preferredId = this.pendingConsultationId || this.activeConsultation()?.id;
        const active = preferredId
          ? consultations.find((c) => c.id === preferredId) || consultations[0] || null
          : consultations[0] || null;
        this.activeConsultation.set(active);
        if (active) {
          this.subscribeToActiveConsultation(active.id);
        }
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
        this.showNotice(error.error?.message || error.message || 'Could not load experts.'),
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
    this.historyDosesLoading.set(true);
    this.dataService.loadDoseHistory(30).subscribe({
      next: ({ doses }) => this.historyDoseEvents.set(doses),
      error: () => {
        /* history optional */
      },
      complete: () => this.historyDosesLoading.set(false),
    });
  }

  private showNotice(message: string) {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), NOTICE_DISMISS_MS);
  }
}
