import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { type RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import type { Consultation } from '../interfaces';
import { supabase } from '../supabase.client';
import { postConsultationAttachmentMultipart } from './attachment-upload';
import { CLINIC_BACKEND_TOKEN_KEY } from './clinic-api.constants';
import { assertBackendSession } from './clinic-api-session';
import type { RazorpayCheckoutResponse, RazorpayOrderResponse, ReminderPreferencePayload } from './clinic-api.types';
import { createJsonApiFetch } from './json-api-fetch';
import { openRazorpayCheckout as launchRazorpayCheckout } from './razorpay-checkout';
import * as rest from './rest-clinic';
import * as sb from './supabase-clinic';

export type { RazorpayCheckoutResponse, RazorpayOrderResponse } from './clinic-api.types';

@Injectable({ providedIn: 'root' })
export class ClinicApiService {
  private readonly backendTokenKey = CLINIC_BACKEND_TOKEN_KEY;

  private readonly apiFetch = createJsonApiFetch(environment.apiUrl, () => this.backendToken);

  private get backendToken() {
    return localStorage.getItem(this.backendTokenKey) || '';
  }

  diseases() {
    return from(sb.supabaseFetchDiseases());
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
    return from(rest.restFetchBillingPlans(this.apiFetch));
  }

  createPaymentOrder(consultationId: string) {
    return from(rest.restCreateRazorpayOrder(this.apiFetch, consultationId));
  }

  verifyPayment(consultationId: string, payment: RazorpayCheckoutResponse) {
    return from(rest.restVerifyRazorpayPayment(this.apiFetch, consultationId, payment));
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
    return from(sb.supabaseUpdateConsultationStatus(consultationId, 'COMPLETED'));
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

  saveReminderPreferences(preferences: ReminderPreferencePayload) {
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

  async openRazorpayCheckout(consultation: Consultation, order: RazorpayOrderResponse) {
    return launchRazorpayCheckout(consultation, order);
  }

  private async fetchConsultationsViaApiOrSupabase() {
    assertBackendSession(this.backendToken);
    return rest.restFetchConsultations(this.apiFetch);
  }

  private async createConsultationViaApiOrSupabase(payload: {
    diseaseId: string;
    intakeAnswers: Record<string, string>;
    purchaseType?: 'ONE_TIME' | 'PLAN';
    planCode?: string;
  }) {
    assertBackendSession(this.backendToken);
    return rest.restCreateConsultation(this.apiFetch, payload);
  }

  private async sendMessageViaApiOrSupabase(consultationId: string, body: string) {
    assertBackendSession(this.backendToken);
    return rest.restSendConsultationMessage(this.apiFetch, consultationId, body);
  }

  private async postConsultationAttachment(consultationId: string, file: File, caption: string, kind?: string) {
    assertBackendSession(this.backendToken);
    return postConsultationAttachmentMultipart({
      apiUrl: environment.apiUrl,
      token: this.backendToken,
      consultationId,
      file,
      caption,
      kind
    });
  }

  private async upsertPrescription(consultationId: string, payload: { notes: string; fileUrl?: string }) {
    await sb.supabaseUpsertLegacyPrescription(consultationId, payload);
    await sb.supabaseUpdateConsultationStatus(consultationId, 'PRESCRIPTION_UPLOADED');
    return { ok: true as const };
  }

  private async fetchDoctorsViaApiOrSupabase() {
    assertBackendSession(this.backendToken);
    return rest.restFetchDoctors(this.apiFetch);
  }

  private async assignDoctorViaApiOrSupabase(consultationId: string, doctorId: string) {
    assertBackendSession(this.backendToken);
    return rest.restAssignDoctor(this.apiFetch, consultationId, doctorId);
  }

  private async fetchReportsViaApiOrSupabase() {
    assertBackendSession(this.backendToken);
    return rest.restFetchAdminReports(this.apiFetch);
  }

  private async createDoctorViaApi(payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    specialty: string;
    registrationNo?: string;
  }) {
    assertBackendSession(this.backendToken);
    return rest.restCreateDoctor(this.apiFetch, payload);
  }

  private async fetchPatientPrescriptions() {
    assertBackendSession(this.backendToken);
    return rest.restFetchPatientPrescriptions(this.apiFetch);
  }

  private async fetchTodayDoseEvents() {
    assertBackendSession(this.backendToken);
    return rest.restFetchTodayDoseEvents(this.apiFetch);
  }

  private async updateDoseEventStatus(doseEventId: string, status: 'TAKEN' | 'SKIPPED', note?: string) {
    assertBackendSession(this.backendToken);
    if (status === 'TAKEN') {
      return rest.restUpdateDoseTaken(this.apiFetch, doseEventId);
    }
    return rest.restUpdateDoseSkipped(this.apiFetch, doseEventId, note);
  }

  private async snoozeDoseEvent(doseEventId: string, minutes: number) {
    assertBackendSession(this.backendToken);
    return rest.restSnoozeDose(this.apiFetch, doseEventId, minutes);
  }

  private async fetchReminderPreferences() {
    assertBackendSession(this.backendToken);
    return rest.restFetchReminderPreferences(this.apiFetch);
  }

  private async updateReminderPreferences(preferences: ReminderPreferencePayload) {
    assertBackendSession(this.backendToken);
    return rest.restUpdateReminderPreferences(this.apiFetch, preferences);
  }
}
