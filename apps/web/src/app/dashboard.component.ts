import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { ClinicApiService } from './clinic-api.service';
import { AuthService } from './auth/auth.service';
import { BillingPlan, Consultation, Disease, Doctor, DoseEvent, Prescription } from './models';
import { PaymentStatusOverlayComponent } from './payment-status-overlay.component';

type PaymentFlowState = 'IDLE' | 'CREATING_ORDER' | 'OPENING_CHECKOUT' | 'VERIFYING' | 'SUCCESS' | 'ERROR';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, AppHeaderComponent, AppFooterComponent, PaymentStatusOverlayComponent],
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
          <div class="panel">
            <h2>Book Consultation</h2>
            <label>
              Purchase type
              <select [(ngModel)]="purchaseType">
                <option value="ONE_TIME">One-time appointment</option>
                <option value="PLAN">Plan purchase</option>
              </select>
            </label>
            @if (purchaseType === 'PLAN') {
              <label>
                Select plan
                <select [(ngModel)]="selectedPlanCode">
                  @for (plan of billingPlans(); track plan.code) {
                    @if (plan.code !== 'ONE_TIME') {
                      <option [value]="plan.code">
                        {{ plan.name }} - {{ plan.priceInPaise / 100 | currency: 'INR' }}
                      </option>
                    }
                  }
                </select>
              </label>
              <p class="muted">{{ selectedPlan()?.description }}</p>
            }
            <label>
              Select problem
              <select [(ngModel)]="selectedDiseaseId" (change)="resetAnswers()">
                @for (disease of diseases(); track disease.id) {
                  <option [value]="disease.id">{{ disease.name }} - {{ disease.feeInPaise / 100 | currency: 'INR' }}</option>
                }
              </select>
            </label>

            @for (question of selectedDisease()?.intakeQuestions || []; track question) {
              <label>
                {{ question }}
                <input [(ngModel)]="intakeAnswers[question]" placeholder="Type your answer" />
              </label>
            }

            <button class="primary" [disabled]="isProcessing()" (click)="bookConsultation()">Create consultation</button>
            <p class="muted">
              Payable now:
              <strong>{{ estimatedPayableInPaise() / 100 | currency: 'INR' }}</strong>.
              After payment, consultation moves to doctor assignment.
            </p>
          </div>

          <ng-container *ngTemplateOutlet="consultationList"></ng-container>
        </section>

        <section class="grid two">
          <div class="panel">
            <h2>Today&apos;s Medicines</h2>
            <label>
              Snooze minutes
              <input type="number" min="5" max="120" [(ngModel)]="snoozeMinutes" />
            </label>
            <div class="cards">
              @for (dose of todayDoseEvents(); track dose.id) {
                <article class="consult-card">
                  <strong>{{ dose.prescriptionItem.medicineName }}</strong>
                  <span>
                    {{ dose.scheduledFor | date: 'shortTime' }} |
                    {{ dose.prescriptionItem.dose || 'Dose as advised' }}
                  </span>
                  <small>Status: {{ dose.status }}</small>
                  @if (dose.status === 'PENDING') {
                    <div class="actions">
                      <button class="primary" [disabled]="isProcessing()" (click)="markDoseTaken(dose.id)">Taken</button>
                      <button class="secondary" [disabled]="isProcessing()" (click)="skipDose(dose.id)">Skip</button>
                      <button class="secondary" [disabled]="isProcessing()" (click)="snoozeDose(dose.id)">Snooze</button>
                    </div>
                  }
                </article>
              } @empty {
                <p class="muted">No medicine reminders for today.</p>
              }
            </div>
          </div>

          <div class="panel">
            <h2>Reminder Preferences</h2>
            <label><input type="checkbox" [(ngModel)]="reminderPreferences.inApp" /> In-app</label>
            <label><input type="checkbox" [(ngModel)]="reminderPreferences.sms" /> SMS</label>
            <label><input type="checkbox" [(ngModel)]="reminderPreferences.whatsapp" /> WhatsApp</label>
            <label><input type="checkbox" [(ngModel)]="reminderPreferences.push" /> Push</label>
            <label>
              Quiet hours start
              <input [(ngModel)]="reminderPreferences.quietHoursStart" placeholder="22:00" />
            </label>
            <label>
              Quiet hours end
              <input [(ngModel)]="reminderPreferences.quietHoursEnd" placeholder="07:00" />
            </label>
            <button class="primary" [disabled]="isProcessing()" (click)="saveReminderPreferences()">Save preferences</button>
          </div>

          <div class="panel">
            <h2>Prescription History</h2>
            <div class="cards">
              @for (prescription of patientPrescriptions(); track prescription.id) {
                <article class="consult-card">
                  <strong>{{ prescription.diagnosis || 'Prescription' }} (v{{ prescription.version || 1 }})</strong>
                  <span>{{ prescription.createdAt | date: 'medium' }}</span>
                  <small>{{ prescription.method || 'Method not specified' }}</small>
                  @if (prescription.items?.length) {
                    <p class="muted">
                      Medicines:
                      {{ prescription.items?.length }}
                    </p>
                  }
                </article>
              } @empty {
                <p class="muted">No prescriptions published yet.</p>
              }
            </div>
          </div>
        </section>
      }

      @if (auth.user()?.role === 'DOCTOR') {
        <section class="grid two">
          <ng-container *ngTemplateOutlet="consultationList"></ng-container>
          <ng-container *ngTemplateOutlet="activeConsultationTools"></ng-container>
        </section>
      }

      @if (auth.user()?.role === 'ADMIN') {
        <section class="stats">
          <div class="panel">
            <span>Total revenue</span>
            <strong>{{ (report()?.revenueInPaise || 0) / 100 | currency: 'INR' }}</strong>
          </div>
          <div class="panel">
            <span>Active doctors</span>
            <strong>{{ report()?.activeDoctors || 0 }}</strong>
          </div>
          <div class="panel">
            <span>Consultations</span>
            <strong>{{ consultations().length }}</strong>
          </div>
        </section>

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
          <ng-container *ngTemplateOutlet="consultationList"></ng-container>
          <ng-container *ngTemplateOutlet="activeConsultationTools"></ng-container>
        </section>
      }
    </main>

    <ng-template #consultationList>
      <div class="panel">
        <h2>Consultations</h2>
        <div class="cards">
          @for (consultation of consultations(); track consultation.id) {
            <article class="consult-card" [class.active]="activeConsultation()?.id === consultation.id">
              <button class="link-card" (click)="setActive(consultation)">
                <strong>{{ consultation.disease.name }}</strong>
                <span>{{ consultation.patient.name }}</span>
                <small>{{ consultation.status }}</small>
                <small>Plan: {{ consultation.billingPlanCode || consultation.payment?.billingPlanCode || 'ONE_TIME' }}</small>
                <small>Amount: {{ (consultation.payment?.amountInPaise || 0) / 100 | currency: 'INR' }}</small>
              </button>
              @if (auth.user()?.role === 'PATIENT' && consultation.status === 'PAYMENT_PENDING') {
                <button class="primary" [disabled]="isProcessing() || paymentFlowState() !== 'IDLE'" (click)="pay(consultation)">
                  Pay now
                </button>
              }
              @if (consultation.prescription || consultation.prescriptions?.length) {
                <p class="success">Prescription uploaded</p>
              }
            </article>
          } @empty {
            <p class="muted">No consultations yet.</p>
          }
        </div>
      </div>
    </ng-template>

    <ng-template #activeConsultationTools>
      <div class="panel">
        @if (activeConsultation(); as consultation) {
          <h2>{{ consultation.disease.name }}</h2>
          <p class="muted">Patient: {{ consultation.patient.name }} | Doctor: {{ consultation.assignedDoctor?.name || 'Not assigned' }}</p>

          <h3>Intake answers</h3>
          @for (answer of consultation.intakeAnswers | keyvalue; track answer.key) {
            <p><strong>{{ answer.key }}:</strong> {{ answer.value }}</p>
          }

          <h3>Chat</h3>
          <div class="chat-box">
            @for (message of consultation.messages; track message.id) {
              <p><strong>{{ message.sender.name }}:</strong> {{ message.body }}</p>
            } @empty {
              <p class="muted">No messages yet.</p>
            }
          </div>
          <label>
            New message
            <textarea [(ngModel)]="messageBody"></textarea>
          </label>
          <button class="secondary" [disabled]="isProcessing()" (click)="sendMessage(consultation)">Send message</button>

          @if (auth.user()?.role !== 'PATIENT') {
            <h3>Prescription</h3>
            <label>
              Notes
              <textarea [(ngModel)]="prescription.notes"></textarea>
            </label>
            <label>
              File URL
              <input [(ngModel)]="prescription.fileUrl" placeholder="https://..." />
            </label>
            <button class="primary" [disabled]="isProcessing()" (click)="uploadPrescription(consultation)">Upload prescription</button>
            <button class="secondary" [disabled]="isProcessing()" (click)="completeConsultation(consultation)">Mark complete</button>
          }

          @if (consultation.prescription) {
            <div class="prescription">
              <h3>Prescription for patient</h3>
              <p>{{ consultation.prescription.notes }}</p>
              @if (consultation.prescription.fileUrl) {
                <a [href]="consultation.prescription.fileUrl" target="_blank" rel="noopener">Open prescription file</a>
              }
            </div>
          }
        } @else {
          <p class="muted">Select a consultation to view details.</p>
        }
      </div>
    </ng-template>

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

  selectedDiseaseId = '';
  purchaseType: 'ONE_TIME' | 'PLAN' = 'ONE_TIME';
  selectedPlanCode = '';
  intakeAnswers: Record<string, string> = {};
  messageBody = '';
  snoozeMinutes = 15;
  prescription = { notes: '', fileUrl: '' };
  assignment = { consultationId: '', doctorId: '' };
  doctorForm = {
    name: 'Dr. New Doctor',
    email: 'newdoctor@vitalisclinic.local',
    mobile: '',
    password: 'Password@123',
    specialty: 'Dermatology'
  };
  reminderPreferences = {
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

  selectedDisease() {
    return this.diseases().find((disease) => disease.id === this.selectedDiseaseId);
  }

  selectedPlan() {
    return this.billingPlans().find((plan) => plan.code === this.selectedPlanCode) || null;
  }

  estimatedPayableInPaise() {
    if (this.purchaseType === 'PLAN') {
      return this.selectedPlan()?.priceInPaise || 0;
    }
    return this.selectedDisease()?.feeInPaise || 0;
  }

  resetAnswers() {
    this.intakeAnswers = {};
  }

  bookConsultation() {
    if (!this.selectedDiseaseId) {
      return this.showNotice('Select a disease first.');
    }

    this.isProcessing.set(true);
    this.api
      .createConsultation({
        diseaseId: this.selectedDiseaseId,
        intakeAnswers: this.intakeAnswers,
        purchaseType: this.purchaseType,
        ...(this.purchaseType === 'PLAN' ? { planCode: this.selectedPlanCode } : {})
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
    if (!consultation) {
      return;
    }
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
    this.prescription.notes = consultation.prescription?.notes || '';
    this.prescription.fileUrl = consultation.prescription?.fileUrl || '';
  }

  sendMessage(consultation: Consultation) {
    if (!this.messageBody.trim()) {
      return;
    }

    this.isProcessing.set(true);
    this.api.sendMessage(consultation.id, this.messageBody).subscribe({
      next: () => {
        this.messageBody = '';
        this.loadConsultations();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not send message.');
      },
      complete: () => this.isProcessing.set(false)
    });
  }

  uploadPrescription(consultation: Consultation) {
    this.isProcessing.set(true);
    this.api.uploadPrescription(consultation.id, this.prescription).subscribe({
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

  completeConsultation(consultation: Consultation) {
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

  saveReminderPreferences() {
    this.isProcessing.set(true);
    this.api.saveReminderPreferences(this.reminderPreferences).subscribe({
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
        this.selectedDiseaseId = diseases[0]?.id || '';
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.showNotice(error.error?.message || error.message || 'Could not load diseases.');
      }
    });
    this.api.billingPlans().subscribe({
      next: ({ plans }) => {
        this.billingPlans.set(plans || []);
        this.selectedPlanCode =
          (plans || []).find((plan) => plan.code !== 'ONE_TIME')?.code ||
          (plans || [])[0]?.code ||
          '';
      },
      error: () => {
        // keep disease-based one-time fallback
      }
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
            ? consultations.find((consultation) => consultation.id === this.activeConsultation()?.id) || null
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
      next: ({ preferences }) => {
        this.reminderPreferences = preferences;
      },
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
