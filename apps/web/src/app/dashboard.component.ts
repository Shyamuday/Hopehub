import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { ClinicApiService } from './clinic-api.service';
import { AuthService } from './auth/auth.service';
import { Disease, Consultation, Doctor } from './models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, AppHeaderComponent, AppFooterComponent],
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
            <p class="muted">After booking, pay securely with Razorpay to move your consultation to doctor assignment.</p>
          </div>

          <ng-container *ngTemplateOutlet="consultationList"></ng-container>
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
              </button>
              @if (auth.user()?.role === 'PATIENT' && consultation.status === 'PAYMENT_PENDING') {
                <button class="primary" [disabled]="isProcessing()" (click)="pay(consultation)">Pay now</button>
              }
              @if (consultation.prescription) {
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

    @if (notice()) {
      <div class="toast">{{ notice() }}</div>
    }

    <app-footer [whatsappLink]="whatsappLink" />
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly diseases = signal<Disease[]>([]);
  readonly consultations = signal<Consultation[]>([]);
  readonly doctors = signal<Doctor[]>([]);
  readonly report = signal<{ revenueInPaise: number; activeDoctors: number; consultations: unknown[] } | null>(null);
  readonly activeConsultation = signal<Consultation | null>(null);
  readonly notice = signal('');
  readonly isLoading = signal(false);
  readonly isProcessing = signal(false);
  readonly title = computed(() => `${this.auth.user()?.role?.toLowerCase()} dashboard`);
  readonly whatsappLink =
    'https://wa.me/919876543210?text=Hi%20Vitalis%20Care%20and%20Research%20Centre%2C%20I%20need%20help%20with%20my%20consultation';
  private realtimeChannel?: RealtimeChannel;

  selectedDiseaseId = '';
  intakeAnswers: Record<string, string> = {};
  messageBody = '';
  prescription = { notes: '', fileUrl: '' };
  assignment = { consultationId: '', doctorId: '' };
  doctorForm = {
    name: 'Dr. New Doctor',
    email: 'newdoctor@vitalisclinic.local',
    mobile: '',
    password: 'Password@123',
    specialty: 'Dermatology'
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

  resetAnswers() {
    this.intakeAnswers = {};
  }

  bookConsultation() {
    if (!this.selectedDiseaseId) {
      return this.showNotice('Select a disease first.');
    }

    this.isProcessing.set(true);
    this.api.createConsultation({ diseaseId: this.selectedDiseaseId, intakeAnswers: this.intakeAnswers }).subscribe({
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
    this.isProcessing.set(true);
    this.api.createPaymentOrder(consultation.id).subscribe({
      next: (order) =>
        this.api
          .openRazorpayCheckout(consultation, order)
          .then((payment) => {
            this.api.verifyPayment(consultation.id, payment).subscribe({
              next: () => {
                this.showNotice('Payment verified. Admin can assign doctor now.');
                this.loadConsultations();
              },
              error: (error) => {
                this.isProcessing.set(false);
                this.showNotice(error.error?.message || error.message || 'Payment verification failed.');
              },
              complete: () => this.isProcessing.set(false)
            });
          })
          .catch((error) => {
            this.isProcessing.set(false);
            this.showNotice(error.message || 'Payment was not completed.');
          }),
      error: (error) => {
        this.isProcessing.set(false);
        this.showNotice(error.error?.message || error.message || 'Payment failed.');
      }
    });
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
    this.loadConsultations();

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

  private showNotice(message: string) {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), 3500);
  }
}
