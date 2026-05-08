import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
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
import { BillingPlan, Consultation, Disease, Doctor, DoseEvent, Prescription } from './models';
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
  ],
  template: `
    <app-header [subtitle]="title()" [user]="auth.user()" [whatsappLink]="whatsappLink" (logout)="logout()" />

    <main class="dashboard">
      @if (isLoading()) {
        <section class="panel">
          <p class="muted">Loading clinic data...</p>
        </section>
      }

      @if (auth.user()?.role === 'PATIENT') {
        <section class="panel hero">
          <div>
            <p class="eyebrow">First launch niche</p>
            <h2>Hair Fall Treatment</h2>
            <p>Book a chat consultation for diagnosis, prescription, and follow-up guidance.</p>
          </div>
          <strong>Fee shown at payment</strong>
        </section>

        <section class="grid two">
          <app-book-consultation-panel
            [diseases]="diseases()"
            [plans]="billingPlans()"
            [disabled]="isProcessing()"
            (booked)="onBooked($event)"
          />
          <app-consultation-list
            [consultations]="consultations()"
            [activeId]="activeConsultation()?.id ?? null"
            [userRole]="auth.user()?.role ?? null"
            [disabled]="isProcessing()"
            [paymentIdle]="paymentFlowState() === 'IDLE'"
            (selected)="setActive($event)"
            (pay)="pay($event)"
          />
        </section>

        <section class="panel">
          <app-consultation-detail
            [consultation]="activeConsultation()"
            [userRole]="auth.user()?.role ?? null"
            [disabled]="isProcessing()"
            [doctorPortalUrl]="doctorPortalUrl"
            (messageSent)="onMessageSent($event)"
            (attachmentsChanged)="loadConsultations()"
          />
        </section>

        <section class="grid two">
          <app-today-medicines
            [doseEvents]="todayDoseEvents()"
            [disabled]="isProcessing()"
            [snoozeMinutes]="snoozeMinutes"
            (snoozeMinutesChange)="snoozeMinutes = $event"
            (taken)="markDoseTaken($event)"
            (skipped)="skipDose($event)"
            (snoozed)="snoozeDose($event)"
          />
          <app-reminder-preferences
            [prefs]="reminderPreferences"
            [disabled]="isProcessing()"
            (saved)="onSavePreferences($event)"
          />
          <app-prescription-history [prescriptions]="patientPrescriptions()" />
        </section>

        <section class="grid two">
          <app-patient-profile />
        </section>
      }

      @if (auth.user()?.role === 'DOCTOR') {
        <section class="grid two">
          <app-consultation-list
            [consultations]="consultations()"
            [activeId]="activeConsultation()?.id ?? null"
            [userRole]="auth.user()?.role ?? null"
            [disabled]="isProcessing()"
            (selected)="setActive($event)"
          />
          <app-consultation-detail
            [consultation]="activeConsultation()"
            [userRole]="auth.user()?.role ?? null"
            [disabled]="isProcessing()"
            [doctorPortalUrl]="doctorPortalUrl"
            (messageSent)="onMessageSent($event)"
            (attachmentsChanged)="loadConsultations()"
          />
        </section>
      }

      @if (auth.user()?.role === 'ADMIN') {
        <app-admin-stats
          [revenueInPaise]="report()?.revenueInPaise || 0"
          [activeDoctors]="report()?.activeDoctors || 0"
          [consultationsCount]="consultations().length"
        />

        <section class="grid two">
          <div class="panel">
            <h2>Add Doctor</h2>
            <label>Name <input [(ngModel)]="doctorForm.name" /></label>
            <label>Email <input [(ngModel)]="doctorForm.email" /></label>
            <label>Mobile <input [(ngModel)]="doctorForm.mobile" /></label>
            <label>Specialty <input [(ngModel)]="doctorForm.specialty" /></label>
            <label>Password <input type="password" [(ngModel)]="doctorForm.password" /></label>
            <button class="primary" (click)="createDoctor()">Create doctor</button>
          </div>

          <div class="panel">
            <h2>Manual Assignment</h2>
            <label>
              Consultation
              <select [(ngModel)]="assignment.consultationId">
                @for (consultation of consultations(); track consultation.id) {
                  <option [value]="consultation.id">
                    {{ consultation.patient.name }} - {{ consultation.disease.name }} - {{ consultation.status }}
                  </option>
                }
              </select>
            </label>
            <label>
              Doctor
              <select [(ngModel)]="assignment.doctorId">
                @for (doctor of doctors(); track doctor.id) {
                  <option [value]="doctor.id">{{ doctor.name }} - {{ doctor.doctorProfile?.specialty }}</option>
                }
              </select>
            </label>
            <button class="primary" (click)="assignDoctor()">Assign doctor</button>
          </div>
        </section>

        <section class="grid two">
          <app-consultation-list
            [consultations]="consultations()"
            [activeId]="activeConsultation()?.id ?? null"
            [userRole]="auth.user()?.role ?? null"
            [disabled]="isProcessing()"
            (selected)="setActive($event)"
          />
          <app-consultation-detail
            [consultation]="activeConsultation()"
            [userRole]="auth.user()?.role ?? null"
            [disabled]="isProcessing()"
            [doctorPortalUrl]="doctorPortalUrl"
            (messageSent)="onMessageSent($event)"
            (uploadPrescription)="onUploadPrescription($event)"
            (complete)="onComplete()"
            (attachmentsChanged)="loadConsultations()"
          />
        </section>
      }
    </main>

    <app-payment-status-overlay
      [state]="paymentFlowState()"
      [title]="paymentFlowTitle()"
      [message]="paymentFlowMessage()"
      [canRetry]="!!paymentFlowConsultation()"
      (retry)="retryPayment()"
      (close)="closePaymentOverlay()"
    />

    @if (notice()) {
      <div class="toast">{{ notice() }}</div>
    }

    <app-footer [whatsappLink]="whatsappLink" />
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly doctorPortalUrl = environment.doctorPortalUrl || '';
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
  readonly whatsappLink =
    'https://wa.me/919876543210?text=Hi%20Vitalis%20Care%20and%20Research%20Centre%2C%20I%20need%20help%20with%20my%20consultation';
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
        ...(payload.purchaseType === 'PLAN' ? { planCode: payload.planCode } : {})
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
    setTimeout(() => this.notice.set(''), 3500);
  }
}
