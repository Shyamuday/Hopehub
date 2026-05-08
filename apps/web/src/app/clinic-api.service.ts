import { Injectable } from '@angular/core';
import { from, map } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase.client';
import { environment } from '../environments/environment';
import { BillingPlan, Consultation, Disease, Doctor, DoseEvent, Prescription } from './models';
import {
  mapConsultationFromApi,
  mapConsultationFromSupabaseRow,
  mapDiseaseFromSupabaseRow,
  mapDoseEventFromApi,
  mapPatientPrescriptionFromApi,
  mapUserFromSupabaseProfile
} from './clinic-api-mappers';

type RazorpayOrderResponse = {
  orderId: string;
  amountInPaise: number;
  currency: string;
  razorpayKeyId: string;
};

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

@Injectable({ providedIn: 'root' })
export class ClinicApiService {
  private readonly backendTokenKey = 'clinic_token';

  diseases() {
    return from(this.fetchDiseases());
  }

  consultations() {
    return from(this.fetchConsultationsViaApiOrSupabase());
  }

  createConsultation(payload: {
    diseaseId: string;
    intakeAnswers: Record<string, string>;
    purchaseType?: 'ONE_TIME' | 'PLAN';
    planCode?: string;
  }) {
    return from(this.createConsultationViaApiOrSupabase(payload));
  }

  billingPlans() {
    return from(this.fetchBillingPlans());
  }

  createPaymentOrder(consultationId: string) {
    return from(this.createRazorpayOrder(consultationId));
  }

  verifyPayment(consultationId: string, payment: RazorpayCheckoutResponse) {
    return from(this.verifyRazorpayPayment(consultationId, payment));
  }

  sendMessage(consultationId: string, body: string) {
    return from(this.sendMessageViaApiOrSupabase(consultationId, body));
  }

  uploadPrescription(consultationId: string, payload: { notes: string; fileUrl?: string }) {
    return from(this.upsertPrescription(consultationId, payload));
  }

  uploadConsultationAttachment(consultationId: string, file: File, caption = '', kind?: string) {
    return from(this.postConsultationAttachment(consultationId, file, caption, kind));
  }

  completeConsultation(consultationId: string) {
    return from(this.updateConsultationStatus(consultationId, 'COMPLETED'));
  }

  doctors() {
    return from(this.fetchDoctorsViaApiOrSupabase());
  }

  createDoctor(payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    specialty: string;
    registrationNo?: string;
  }) {
    return from(this.createDoctorViaApi(payload));
  }

  assignDoctor(consultationId: string, doctorId: string) {
    return from(this.assignDoctorViaApiOrSupabase(consultationId, doctorId));
  }

  reports() {
    return from(this.fetchReportsViaApiOrSupabase());
  }

  patientPrescriptions() {
    return from(this.fetchPatientPrescriptions());
  }

  todayDoseEvents() {
    return from(this.fetchTodayDoseEvents());
  }

  markDoseTaken(doseEventId: string) {
    return from(this.updateDoseEventStatus(doseEventId, 'TAKEN'));
  }

  skipDose(doseEventId: string, note?: string) {
    return from(this.updateDoseEventStatus(doseEventId, 'SKIPPED', note));
  }

  snoozeDose(doseEventId: string, minutes = 15) {
    return from(this.snoozeDoseEvent(doseEventId, minutes));
  }

  reminderPreferences() {
    return from(this.fetchReminderPreferences());
  }

  saveReminderPreferences(preferences: {
    inApp: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }) {
    return from(this.updateReminderPreferences(preferences));
  }

  watchClinicChanges(onChange: () => void): RealtimeChannel {
    return supabase
      .channel('clinic-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onChange)
      .subscribe();
  }

  private async fetchDiseases() {
    const { data, error } = await supabase
      .from('diseases')
      .select('*')
      .eq('is_active', true)
      .order('fee_in_paise');

    if (error) {
      throw error;
    }

    return { diseases: (data || []).map((row) => mapDiseaseFromSupabaseRow(row as Record<string, unknown>)) };
  }

  private async fetchConsultations() {
    const { data, error } = await supabase
      .from('consultations')
      .select(
        `
          *,
          disease:diseases(*),
          patient:profiles!consultations_patient_id_fkey(*),
          assigned_doctor:profiles!consultations_assigned_doctor_id_fkey(*),
          payment:payments(*),
          messages(*, sender:profiles!messages_sender_id_fkey(*)),
          prescription:prescriptions(*)
        `
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { consultations: (data || []).map((row) => mapConsultationFromSupabaseRow(row as Record<string, unknown>)) };
  }

  private get backendToken() {
    return localStorage.getItem(this.backendTokenKey) || '';
  }

  private async apiFetch<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${environment.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.backendToken ? { Authorization: `Bearer ${this.backendToken}` } : {}),
        ...(init?.headers || {})
      }
    });

    if (!response.ok) {
      let message = 'Request failed.';
      try {
        message = (await response.json())?.message || message;
      } catch {
        // no-op
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  }

  private async fetchConsultationsViaApiOrSupabase() {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    const response = await this.apiFetch<{ consultations: Array<Record<string, any>> }>('/consultations');
    return { consultations: (response.consultations || []).map((row) => mapConsultationFromApi(row as Record<string, unknown>)) };
  }

  private async insertConsultation(payload: { diseaseId: string; intakeAnswers: Record<string, string> }) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Login required.');
    }

    const { data: disease, error: diseaseError } = await supabase
      .from('diseases')
      .select('*')
      .eq('id', payload.diseaseId)
      .single();

    if (diseaseError) {
      throw diseaseError;
    }

    const { data: consultation, error } = await supabase
      .from('consultations')
      .insert({
        patient_id: user.id,
        disease_id: payload.diseaseId,
        intake_answers: payload.intakeAnswers
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    const { error: paymentError } = await supabase.from('payments').insert({
      consultation_id: consultation.id,
      amount_in_paise: disease.fee_in_paise,
      status: 'CREATED'
    });

    if (paymentError) {
      throw paymentError;
    }

    return { consultation };
  }

  private async createConsultationViaApiOrSupabase(payload: {
    diseaseId: string;
    intakeAnswers: Record<string, string>;
    purchaseType?: 'ONE_TIME' | 'PLAN';
    planCode?: string;
  }) {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    return this.apiFetch('/consultations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  private async markPaymentPaid(consultationId: string) {
    const providerPaymentId = `pay_dev_${Date.now()}`;
    const { error: paymentError } = await supabase
      .from('payments')
      .update({ status: 'PAID', provider_payment_id: providerPaymentId })
      .eq('consultation_id', consultationId);

    if (paymentError) {
      throw paymentError;
    }

    const { error: consultationError } = await supabase
      .from('consultations')
      .update({ status: 'PAID' })
      .eq('id', consultationId);

    if (consultationError) {
      throw consultationError;
    }

    return { consultation: { id: consultationId } as Consultation };
  }

  async openRazorpayCheckout(consultation: Consultation, order: RazorpayOrderResponse) {
    await this.loadRazorpayScript();

    const user = (await supabase.auth.getUser()).data.user;
    return new Promise<RazorpayCheckoutResponse>((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error('Razorpay checkout script failed to load.'));
        return;
      }

      const checkout = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: 'Vitalis Care and Research Centre',
        description: consultation.disease.name,
        order_id: order.orderId,
        prefill: {
          name: consultation.patient.name,
          email: user?.email || '',
          contact: consultation.patient.mobile || ''
        },
        theme: {
          color: '#0f62fe'
        },
        handler: (response: RazorpayCheckoutResponse) => resolve(response),
        modal: {
          ondismiss: () => reject(new Error('Payment was cancelled.'))
        }
      });

      checkout.open();
    });
  }

  private async createRazorpayOrder(consultationId: string) {
    return this.apiFetch<RazorpayOrderResponse>(`/payments/${consultationId}/create-order`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  private async verifyRazorpayPayment(consultationId: string, payment: RazorpayCheckoutResponse) {
    return this.apiFetch(`/payments/${consultationId}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature
      })
    });
  }

  private async fetchBillingPlans() {
    return this.apiFetch<{ plans: BillingPlan[] }>('/billing/plans');
  }

  private loadRazorpayScript() {
    if (window.Razorpay) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
      document.body.appendChild(script);
    });
  }

  private async insertMessage(consultationId: string, body: string) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Login required.');
    }

    const { error } = await supabase.from('messages').insert({
      consultation_id: consultationId,
      sender_id: user.id,
      body
    });

    if (error) {
      throw error;
    }

    await this.updateConsultationStatus(consultationId, 'IN_PROGRESS');
    return { ok: true };
  }

  private async sendMessageViaApiOrSupabase(consultationId: string, body: string) {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    return this.apiFetch(`/consultations/${consultationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
  }

  private async postConsultationAttachment(
    consultationId: string,
    file: File,
    caption: string,
    kind?: string
  ): Promise<{ attachment: Record<string, unknown> }> {
    const token = this.backendToken;
    if (!token) {
      throw new Error('Backend session missing. Please login again.');
    }

    const fd = new FormData();
    fd.append('file', file);
    if (caption.trim()) {
      fd.append('caption', caption.trim());
    }
    if (kind) {
      fd.append('kind', kind);
    }

    const response = await fetch(`${environment.apiUrl}/consultations/${consultationId}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });

    if (!response.ok) {
      let message = 'Upload failed.';
      try {
        message = (await response.json() as { message?: string })?.message || message;
      } catch {
        // no-op
      }
      throw new Error(message);
    }

    return (await response.json()) as { attachment: Record<string, unknown> };
  }

  private async upsertPrescription(consultationId: string, payload: { notes: string; fileUrl?: string }) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Login required.');
    }

    const { error } = await supabase.from('prescriptions').upsert({
      consultation_id: consultationId,
      uploaded_by_id: user.id,
      notes: payload.notes,
      file_url: payload.fileUrl || null
    });

    if (error) {
      throw error;
    }

    await this.updateConsultationStatus(consultationId, 'PRESCRIPTION_UPLOADED');
    return { ok: true };
  }

  private async updateConsultationStatus(consultationId: string, status: Consultation['status']) {
    const { error } = await supabase.from('consultations').update({ status }).eq('id', consultationId);
    if (error) {
      throw error;
    }

    return { ok: true };
  }

  private async fetchDoctors() {
    const { data, error } = await supabase
      .from('doctors')
      .select('*, profile:profiles(*)')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return {
      doctors: (data || []).map((row): Doctor => ({
        ...mapUserFromSupabaseProfile(row.profile as Record<string, unknown> | null),
        isActive: row.profile?.is_active ?? true,
        doctorProfile: {
          specialty: row.specialty,
          registrationNo: row.registration_no,
          isAvailable: row.is_available
        }
      }))
    };
  }

  private async fetchDoctorsViaApiOrSupabase() {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    return this.apiFetch<{ doctors: Doctor[] }>('/admin/doctors');
  }

  private async assignDoctorToConsultation(consultationId: string, doctorId: string) {
    const { error } = await supabase
      .from('consultations')
      .update({ assigned_doctor_id: doctorId, status: 'ASSIGNED' })
      .eq('id', consultationId);

    if (error) {
      throw error;
    }

    return { ok: true };
  }

  private async assignDoctorViaApiOrSupabase(consultationId: string, doctorId: string) {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    return this.apiFetch(`/consultations/${consultationId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ doctorId })
    });
  }

  private async fetchReports() {
    const [{ consultations }, { doctors }] = await Promise.all([this.fetchConsultations(), this.fetchDoctors()]);
    const revenueInPaise = consultations
      .filter((consultation) => consultation.payment?.status === 'PAID')
      .reduce((total, consultation) => total + (consultation.payment?.amountInPaise || 0), 0);

    return {
      revenueInPaise,
      activeDoctors: doctors.filter((doctor) => doctor.isActive).length,
      consultations
    };
  }

  private async fetchReportsViaApiOrSupabase() {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    return this.apiFetch<{ revenueInPaise: number; activeDoctors: number; consultations: unknown[] }>('/admin/reports');
  }

  private async createDoctorViaApi(payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    specialty: string;
    registrationNo?: string;
  }) {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    return this.apiFetch('/admin/doctors', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  private async fetchPatientPrescriptions() {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    const response = await this.apiFetch<{ prescriptions: Array<Record<string, any>> }>('/patient/prescriptions');
    return { prescriptions: (response.prescriptions || []).map((row) => mapPatientPrescriptionFromApi(row as Record<string, unknown>)) };
  }

  private async fetchTodayDoseEvents() {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    const response = await this.apiFetch<{ doses: Array<Record<string, any>> }>('/patient/today-doses');
    return { doseEvents: (response.doses || []).map((row) => mapDoseEventFromApi(row as Record<string, unknown>)) };
  }

  private async updateDoseEventStatus(doseEventId: string, status: 'TAKEN' | 'SKIPPED', note?: string) {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    if (status === 'TAKEN') {
      return this.apiFetch(`/patient/dose-events/${doseEventId}/take`, { method: 'POST' });
    }

    return this.apiFetch(`/patient/dose-events/${doseEventId}/skip`, {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {})
    });
  }

  private async snoozeDoseEvent(doseEventId: string, minutes: number) {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    return this.apiFetch(`/patient/dose-events/${doseEventId}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ minutes })
    });
  }

  private async fetchReminderPreferences() {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    return this.apiFetch<{
      preferences: {
        inApp: boolean;
        sms: boolean;
        whatsapp: boolean;
        push: boolean;
        quietHoursStart: string;
        quietHoursEnd: string;
      };
    }>('/patient/reminder-preferences');
  }

  private async updateReminderPreferences(preferences: {
    inApp: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }) {
    if (!this.backendToken) {
      throw new Error('Backend session missing. Please login again.');
    }

    return this.apiFetch('/patient/reminder-preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  }
}
