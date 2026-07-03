import { Service } from '@angular/core';
import { from } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { API_PATHS } from './core/constants/api-paths.constants';
import { DEFAULT_SNOOZE_MINUTES } from './core/constants/timing.constants';
import { RAZORPAY_CHECKOUT } from './core/constants/branding.constants';
import { SOCKET_EVENTS, SOCKET_TRANSPORTS } from './core/constants/socket.constants';
import { environment } from '../environments/environment';
import { BillingPlan, Consultation, Doctor, LabResult } from './models';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import {
  mapConsultationFromApi,
  mapDiseaseFromApi,
  mapDoseEventFromApi,
  mapPatientPrescriptionFromApi
} from './clinic-api/clinic-api.mappers';
import type { RazorpayCheckoutResponse, RazorpayOrderResponse, RealtimeSubscription } from './clinic-api/clinic-api.types';

export type { RazorpayCheckoutResponse, RazorpayOrderResponse, RealtimeSubscription } from './clinic-api/clinic-api.types';

@Service()
export class ClinicApiService {
  private readonly client = new ClinicApiClient();

  diseases() {
    return from(this.fetchDiseases());
  }

  consultations() {
    return from(this.fetchConsultations());
  }

  createConsultation(payload: {
    diseaseId: string;
    intakeAnswers: Record<string, string>;
    purchaseType?: 'ONE_TIME' | 'PLAN';
    planCode?: string;
  }) {
    return from(this.client.apiFetch(API_PATHS.CONSULTATIONS, {
      method: 'POST',
      body: JSON.stringify(payload)
    }));
  }

  billingPlans() {
    return from(this.client.apiFetch<{ plans: BillingPlan[] }>(API_PATHS.BILLING_PLANS));
  }

  createPaymentOrder(consultationId: string) {
    return from(this.client.apiFetch<RazorpayOrderResponse>(API_PATHS.PAYMENTS.CREATE_ORDER(consultationId), {
      method: 'POST',
      body: JSON.stringify({})
    }));
  }

  verifyPayment(consultationId: string, payment: RazorpayCheckoutResponse) {
    return from(this.client.apiFetch(API_PATHS.PAYMENTS.VERIFY(consultationId), {
      method: 'POST',
      body: JSON.stringify({
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature
      })
    }));
  }

  sendMessage(consultationId: string, body: string) {
    return from(this.client.apiFetch(`/consultations/${consultationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body })
    }));
  }

  completeConsultation(consultationId: string) {
    return from(this.client.apiFetch(`/consultations/${consultationId}/complete`, { method: 'POST' }));
  }

  uploadPrescription(consultationId: string, payload: { notes: string; fileUrl?: string }) {
    return from(this.client.apiFetch(`/consultations/${consultationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        body: `[Prescription Notes]\n${payload.notes}${payload.fileUrl ? `\nFile: ${payload.fileUrl}` : ''}`
      })
    }));
  }

  doctors() {
    return from(this.client.apiFetch<{ doctors: Doctor[] }>(API_PATHS.ADMIN.DOCTORS));
  }

  createDoctor(payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    specialty: string;
    registrationNo?: string;
  }) {
    return from(this.client.apiFetch(API_PATHS.ADMIN.DOCTORS, {
      method: 'POST',
      body: JSON.stringify(payload)
    }));
  }

  assignDoctor(consultationId: string, doctorId: string) {
    return from(this.client.apiFetch(`/consultations/${consultationId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ doctorId })
    }));
  }

  reports() {
    return from(this.client.apiFetch<{ revenueInPaise: number; activeDoctors: number; consultations: unknown[] }>(API_PATHS.ADMIN.REPORTS));
  }

  patientPrescriptions() {
    return from(this.fetchPatientPrescriptions());
  }

  patientLabResults() {
    return from(this.fetchPatientLabResults());
  }

  todayDoseEvents() {
    return from(this.fetchTodayDoseEvents());
  }

  medicineReminders() {
    return from(this.fetchMedicineReminders());
  }

  markDoseTaken(doseEventId: string) {
    return from(this.client.apiFetch(API_PATHS.PATIENT.DOSE_TAKE(doseEventId), { method: 'POST' }));
  }

  skipDose(doseEventId: string, note?: string) {
    return from(this.client.apiFetch(API_PATHS.PATIENT.DOSE_SKIP(doseEventId), {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {})
    }));
  }

  snoozeDose(doseEventId: string, minutes = DEFAULT_SNOOZE_MINUTES) {
    return from(this.client.apiFetch(API_PATHS.PATIENT.DOSE_SNOOZE(doseEventId), {
      method: 'POST',
      body: JSON.stringify({ minutes })
    }));
  }

  explainDose(doseEventId: string, note: string) {
    return from(this.client.apiFetch(API_PATHS.PATIENT.DOSE_EXPLAIN(doseEventId), {
      method: 'POST',
      body: JSON.stringify({ note })
    }));
  }

  reminderPreferences() {
    return from(this.client.apiFetch<{
      preferences: {
        inApp: boolean;
        sms: boolean;
        whatsapp: boolean;
        push: boolean;
        quietHoursStart: string;
        quietHoursEnd: string;
      };
    }>(API_PATHS.PATIENT.REMINDER_PREFERENCES));
  }

  saveReminderPreferences(preferences: {
    inApp: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }) {
    return from(this.client.apiFetch(API_PATHS.PATIENT.REMINDER_PREFERENCES, {
      method: 'PUT',
      body: JSON.stringify(preferences)
    }));
  }

  watchClinicChanges(onChange: () => void): RealtimeSubscription {
    const token = this.client.backendToken;
    const socket: Socket = io(environment.apiUrl, {
      auth: { token },
      transports: [...SOCKET_TRANSPORTS]
    });

    socket.on('consultation:updated', onChange);
    socket.on('message:new', onChange);
    socket.on('prescription:new', onChange);
    socket.on('payment:updated', onChange);

    return { unsubscribe: () => socket.disconnect() };
  }

  subscribeToConsultation(socket: Socket, consultationId: string) {
    socket.emit(SOCKET_EVENTS.SUBSCRIBE_CONSULTATION, consultationId);
  }

  async openRazorpayCheckout(consultation: Consultation, order: RazorpayOrderResponse) {
    await this.client.loadRazorpayScript();

    return new Promise<RazorpayCheckoutResponse>((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error('Razorpay checkout script failed to load.'));
        return;
      }

      const checkout = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: RAZORPAY_CHECKOUT.NAME,
        description: consultation.disease.name,
        order_id: order.orderId,
        prefill: {
          name: consultation.patient.name,
          contact: consultation.patient.mobile || ''
        },
        theme: { color: RAZORPAY_CHECKOUT.THEME_COLOR },
        handler: (response: RazorpayCheckoutResponse) => resolve(response),
        modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) }
      });

      checkout.open();
    });
  }

  private async fetchDiseases() {
    const response = await this.client.apiFetch<{ diseases: Array<Record<string, unknown>> }>('/diseases');
    return { diseases: (response.diseases || []).map((row) => mapDiseaseFromApi(row)) };
  }

  private async fetchConsultations() {
    if (!this.client.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    const response = await this.client.apiFetch<{ consultations: Array<Record<string, unknown>> }>(API_PATHS.CONSULTATIONS);
    return { consultations: (response.consultations || []).map((row) => mapConsultationFromApi(row)) };
  }

  private async fetchPatientPrescriptions() {
    if (!this.client.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    const response = await this.client.apiFetch<{ prescriptions: Array<Record<string, unknown>> }>(API_PATHS.PATIENT.PRESCRIPTIONS);
    return { prescriptions: (response.prescriptions || []).map((row) => mapPatientPrescriptionFromApi(row)) };
  }

  private async fetchPatientLabResults() {
    if (!this.client.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    const response = await this.client.apiFetch<{ referrals: LabResult[] }>(API_PATHS.PATIENT.LAB_RESULTS);
    return { referrals: response.referrals || [] };
  }

  private async fetchTodayDoseEvents() {
    if (!this.client.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    const response = await this.client.apiFetch<{ doses: Array<Record<string, unknown>> }>(API_PATHS.PATIENT.TODAY_DOSES);
    return { doseEvents: (response.doses || []).map((row) => mapDoseEventFromApi(row)) };
  }

  private async fetchMedicineReminders() {
    if (!this.client.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    const response = await this.client.apiFetch<{
      today: Array<Record<string, unknown>>;
      needingReason: Array<Record<string, unknown>>;
    }>(API_PATHS.PATIENT.MEDICINE_REMINDERS);

    return {
      today: (response.today || []).map((row) => mapDoseEventFromApi(row)),
      needingReason: (response.needingReason || []).map((row) => mapDoseEventFromApi(row))
    };
  }
}
