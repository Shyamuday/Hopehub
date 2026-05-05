import { Injectable } from '@angular/core';
import { from, map } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase.client';
import { environment } from '../environments/environment';
import { Consultation, Disease, Doctor, DoseEvent, Prescription } from './models';

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

  createConsultation(payload: { diseaseId: string; intakeAnswers: Record<string, string> }) {
    return from(this.createConsultationViaApiOrSupabase(payload));
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

    return { diseases: (data || []).map(this.toDisease) };
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

    return { consultations: (data || []).map((row) => this.toConsultation(row)) };
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
    return { consultations: (response.consultations || []).map((row) => this.toConsultationFromApi(row)) };
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

  private async createConsultationViaApiOrSupabase(payload: { diseaseId: string; intakeAnswers: Record<string, string> }) {
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
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      throw new Error('Login required.');
    }

    const response = await fetch(`${environment.apiUrl}/payments/${consultationId}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: user.id })
    });

    if (!response.ok) {
      throw new Error((await response.json()).message || 'Could not create Razorpay order.');
    }

    return (await response.json()) as RazorpayOrderResponse;
  }

  private async verifyRazorpayPayment(consultationId: string, payment: RazorpayCheckoutResponse) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      throw new Error('Login required.');
    }

    const response = await fetch(`${environment.apiUrl}/payments/${consultationId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: user.id,
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature
      })
    });

    if (!response.ok) {
      throw new Error((await response.json()).message || 'Could not verify Razorpay payment.');
    }

    return response.json();
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
        ...this.toUser(row.profile),
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
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Login required.');
    }

    const { data, error } = await supabase
      .from('prescriptions')
      .select(
        `
          *,
          method_option:prescription_options!prescriptions_method_option_id_fkey(label),
          diagnosed_disease_option:prescription_options!prescriptions_diagnosed_disease_option_id_fkey(label),
          items:prescription_items(*)
        `
      )
      .eq('patient_id', user.id)
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const prescriptions: Prescription[] = (data || []).map((row: Record<string, any>) => ({
      id: row['id'],
      version: row['version'],
      diagnosis: row['diagnosis'],
      advice: row['advice'],
      notes: row['notes'],
      fileUrl: row['file_url'],
      status: row['status'],
      followUpDate: row['follow_up_date'],
      method: row['method_option']?.label || null,
      diagnosedDisease: row['diagnosed_disease_option']?.label || null,
      items: (row['items'] || []).map((item: Record<string, any>) => ({
        id: item['id'],
        medicineName: item['medicine_name'],
        strength: item['strength'],
        dose: item['dose'],
        frequency: item['frequency'],
        duration: item['duration'],
        instructions: item['instructions']
      })),
      createdAt: row['created_at']
    }));

    return { prescriptions };
  }

  private async fetchTodayDoseEvents() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Login required.');
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const { data, error } = await supabase
      .from('medicine_dose_events')
      .select('*, prescription_item:prescription_items(*)')
      .eq('patient_id', user.id)
      .gte('scheduled_for', start.toISOString())
      .lt('scheduled_for', end.toISOString())
      .order('scheduled_for', { ascending: true });

    if (error) {
      throw error;
    }

    const doseEvents: DoseEvent[] = (data || []).map((row: Record<string, any>) => ({
      id: row['id'],
      scheduledFor: row['scheduled_for'],
      status: row['status'],
      note: row['note'],
      takenAt: row['taken_at'],
      skippedAt: row['skipped_at'],
      prescriptionItem: {
        id: row['prescription_item']?.id || '',
        medicineName: row['prescription_item']?.medicine_name || 'Medicine',
        strength: row['prescription_item']?.strength,
        dose: row['prescription_item']?.dose,
        frequency: row['prescription_item']?.frequency,
        duration: row['prescription_item']?.duration,
        instructions: row['prescription_item']?.instructions
      }
    }));

    return { doseEvents };
  }

  private async updateDoseEventStatus(doseEventId: string, status: 'TAKEN' | 'SKIPPED', note?: string) {
    const payload =
      status === 'TAKEN'
        ? { status, taken_at: new Date().toISOString(), skipped_at: null }
        : { status, skipped_at: new Date().toISOString(), note: note || null };
    const { error } = await supabase.from('medicine_dose_events').update(payload).eq('id', doseEventId);

    if (error) {
      throw error;
    }

    return { ok: true };
  }

  private toDisease(row: Record<string, any>): Disease {
    return {
      id: row['id'],
      name: row['name'],
      description: row['description'],
      feeInPaise: row['fee_in_paise'],
      intakeQuestions: row['intake_questions'] || []
    };
  }

  private toUser(row: Record<string, any> | null): Doctor {
    return {
      id: row?.['id'] || '',
      name: row?.['name'] || 'Unknown',
      mobile: row?.['mobile'] || null,
      role: row?.['role'] || 'PATIENT',
      isActive: row?.['is_active'] ?? true
    };
  }

  private toConsultation(row: Record<string, any>): Consultation {
    return {
      id: row['id'],
      status: row['status'],
      intakeAnswers: row['intake_answers'] || {},
      createdAt: row['created_at'],
      patient: this.toUser(row['patient']),
      assignedDoctor: row['assigned_doctor'] ? this.toUser(row['assigned_doctor']) : null,
      disease: this.toDisease(row['disease']),
      payment: row['payment']
        ? {
          id: row['payment'].id,
          amountInPaise: row['payment'].amount_in_paise,
          status: row['payment'].status,
          providerOrderId: row['payment'].provider_order_id
        }
        : null,
      messages: (row['messages'] || [])
        .map((message: Record<string, any>) => ({
          id: message['id'],
          body: message['body'],
          createdAt: message['created_at'],
          sender: this.toUser(message['sender'])
        }))
        .sort((a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt)),
      prescription: row['prescription']
        ? {
          id: row['prescription'].id,
          notes: row['prescription'].notes,
          fileUrl: row['prescription'].file_url,
          createdAt: row['prescription'].created_at
        }
        : null
    };
  }

  private toConsultationFromApi(row: Record<string, any>): Consultation {
    const prescriptions = row['prescriptions'] || [];
    const latestPrescription = prescriptions[0] || null;

    return {
      id: row['id'],
      status: row['status'],
      intakeAnswers: row['intakeAnswers'] || {},
      createdAt: row['createdAt'],
      patient: row['patient'],
      assignedDoctor: row['assignedDoctor'] || null,
      disease: row['disease'],
      payment: row['payment'] || null,
      messages: row['messages'] || [],
      prescription: latestPrescription
        ? {
            id: latestPrescription.id,
            notes: latestPrescription.notes,
            fileUrl: latestPrescription.fileUrl,
            createdAt: latestPrescription.createdAt
          }
        : null,
      prescriptions: prescriptions.map((prescription: Record<string, any>) => ({
        id: prescription.id,
        version: prescription.version,
        diagnosis: prescription.diagnosis,
        notes: prescription.notes,
        fileUrl: prescription.fileUrl,
        createdAt: prescription.createdAt
      }))
    };
  }
}
