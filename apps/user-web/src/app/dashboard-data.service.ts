import { inject, signal, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { ClinicApiService } from './clinic-api.service';
import { ProductAnalyticsService } from './core/services/product-analytics.service';
import { PRODUCT_ANALYTICS_EVENTS } from './core/constants/analytics.constants';
import { AuthService } from './auth/auth.service';
import { BillingPlan, Consultation, Disease, Doctor, DoseEvent, LabResult, Prescription } from './models';
import { ReminderPrefs } from './reminder-preferences.component';

@Service()
export class DashboardDataService {
  private readonly api = inject(ClinicApiService);
  private readonly auth = inject(AuthService);

  loadDiseases(): Observable<{ diseases: Disease[] }> {
    return this.api.diseases();
  }

  loadBillingPlans(): Observable<{ plans: BillingPlan[] }> {
    return this.api.billingPlans();
  }

  loadConsultations(): Observable<{ consultations: Consultation[] }> {
    return this.api.consultations();
  }

  loadDoctors(): Observable<{ doctors: Doctor[] }> {
    return this.api.doctors();
  }

  loadReports(): Observable<{ revenueInPaise: number; activeDoctors: number; consultations: unknown[] }> {
    return this.api.reports();
  }

  loadReminderPreferences(): Observable<{ preferences: ReminderPrefs }> {
    return this.api.reminderPreferences();
  }

  loadPatientPrescriptions(): Observable<{ prescriptions: Prescription[] }> {
    return this.api.patientPrescriptions();
  }

  loadPatientLabResults(): Observable<{ referrals: LabResult[] }> {
    return this.api.patientLabResults();
  }

  loadTodayDoseEvents(): Observable<{ doseEvents: DoseEvent[] }> {
    return this.api.todayDoseEvents();
  }

  loadMedicineReminders(): Observable<{ today: DoseEvent[]; needingReason: DoseEvent[] }> {
    return this.api.medicineReminders();
  }

  watchChanges(onChange: () => void) {
    return this.api.watchClinicChanges(onChange);
  }

  isPatient() {
    return this.auth.user()?.role === 'PATIENT';
  }

  isAdmin() {
    return this.auth.user()?.role === 'ADMIN';
  }
}

export type PaymentFlowState = 'IDLE' | 'CREATING_ORDER' | 'OPENING_CHECKOUT' | 'VERIFYING' | 'SUCCESS' | 'ERROR';

@Service()
export class DashboardPaymentService {
  readonly paymentFlowState = signal<PaymentFlowState>('IDLE');
  readonly paymentFlowConsultation = signal<Consultation | null>(null);
  readonly paymentFlowError = signal('');

  private readonly api = inject(ClinicApiService);
  private readonly analytics = inject(ProductAnalyticsService);

  pay(
    consultation: Consultation,
    onSuccess: () => void,
    onError: (message: string) => void,
    onProcessingChange: (processing: boolean) => void
  ) {
    this.paymentFlowConsultation.set(consultation);
    this.paymentFlowError.set('');
    this.paymentFlowState.set('CREATING_ORDER');
    onProcessingChange(true);

    this.api.createPaymentOrder(consultation.id).subscribe({
      next: (order) => {
        this.paymentFlowState.set('OPENING_CHECKOUT');
        this.analytics.track(PRODUCT_ANALYTICS_EVENTS.PAYMENT_CHECKOUT_OPENED, {
          consultationId: consultation.id,
          orderId: order.orderId
        });
        this.api
          .openRazorpayCheckout(consultation, order)
          .then((payment) => {
            this.paymentFlowState.set('VERIFYING');
            this.api.verifyPayment(consultation.id, payment).subscribe({
              next: () => {
                this.paymentFlowState.set('SUCCESS');
                onSuccess();
              },
              error: (error) => {
                onProcessingChange(false);
                this.paymentFlowState.set('ERROR');
                const message = error.error?.message || error.message || 'Payment verification failed.';
                this.paymentFlowError.set(message);
                onError(message);
              },
              complete: () => onProcessingChange(false)
            });
          })
          .catch((error) => {
            onProcessingChange(false);
            this.paymentFlowState.set('ERROR');
            const message = error.message || 'Payment was not completed.';
            this.paymentFlowError.set(message);
            onError(message);
          });
      },
      error: (error) => {
        onProcessingChange(false);
        this.paymentFlowState.set('ERROR');
        const message = error.error?.message || error.message || 'Payment failed.';
        this.paymentFlowError.set(message);
        onError(message);
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

  retryPayment(
    onSuccess: () => void,
    onError: (message: string) => void,
    onProcessingChange: (processing: boolean) => void
  ) {
    const consultation = this.paymentFlowConsultation();
    if (!consultation) return;
    this.pay(consultation, onSuccess, onError, onProcessingChange);
  }

  closePaymentOverlay() {
    if (this.paymentFlowState() === 'SUCCESS' || this.paymentFlowState() === 'ERROR') {
      this.paymentFlowState.set('IDLE');
      this.paymentFlowError.set('');
      this.paymentFlowConsultation.set(null);
    }
  }
}
