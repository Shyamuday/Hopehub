import {
  mapConsultationFromApi,
  mapDoseEventFromApi,
  mapPatientPrescriptionFromApi
} from '../clinic-api-mappers';
import type { BillingPlan, Consultation, Doctor, Prescription } from '../interfaces';
import type { JsonApiFetch } from './json-api-fetch';
import type { RazorpayOrderResponse, ReminderPreferencePayload } from './clinic-api.types';

export async function restFetchConsultations(apiFetch: JsonApiFetch): Promise<{ consultations: Consultation[] }> {
  const response = await apiFetch<{ consultations: Array<Record<string, unknown>> }>('/consultations');
  return {
    consultations: (response.consultations || []).map((row) => mapConsultationFromApi(row))
  };
}

export async function restCreateConsultation(
  apiFetch: JsonApiFetch,
  payload: {
    diseaseId: string;
    intakeAnswers: Record<string, string>;
    purchaseType?: 'ONE_TIME' | 'PLAN';
    planCode?: string;
  }
) {
  return apiFetch('/consultations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function restCreateRazorpayOrder(apiFetch: JsonApiFetch, consultationId: string) {
  return apiFetch<RazorpayOrderResponse>(`/payments/${consultationId}/create-order`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function restVerifyRazorpayPayment(
  apiFetch: JsonApiFetch,
  consultationId: string,
  payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
) {
  return apiFetch(`/payments/${consultationId}/verify`, {
    method: 'POST',
    body: JSON.stringify({
      razorpayOrderId: payment.razorpay_order_id,
      razorpayPaymentId: payment.razorpay_payment_id,
      razorpaySignature: payment.razorpay_signature
    })
  });
}

export async function restFetchBillingPlans(apiFetch: JsonApiFetch) {
  return apiFetch<{ plans: BillingPlan[] }>('/billing/plans');
}

export async function restSendConsultationMessage(apiFetch: JsonApiFetch, consultationId: string, body: string) {
  return apiFetch(`/consultations/${consultationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body })
  });
}

export async function restAssignDoctor(apiFetch: JsonApiFetch, consultationId: string, doctorId: string) {
  return apiFetch(`/consultations/${consultationId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ doctorId })
  });
}

export async function restFetchAdminReports(apiFetch: JsonApiFetch) {
  return apiFetch<{ revenueInPaise: number; activeDoctors: number; consultations: unknown[] }>('/admin/reports');
}

export async function restCreateDoctor(
  apiFetch: JsonApiFetch,
  payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    specialty: string;
    registrationNo?: string;
  }
) {
  return apiFetch('/admin/doctors', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function restFetchPatientPrescriptions(apiFetch: JsonApiFetch): Promise<{ prescriptions: Prescription[] }> {
  const response = await apiFetch<{ prescriptions: Array<Record<string, unknown>> }>('/patient/prescriptions');
  return {
    prescriptions: (response.prescriptions || []).map((row) => mapPatientPrescriptionFromApi(row))
  };
}

export async function restFetchTodayDoseEvents(apiFetch: JsonApiFetch) {
  const response = await apiFetch<{ doses: Array<Record<string, unknown>> }>('/patient/today-doses');
  return { doseEvents: (response.doses || []).map((row) => mapDoseEventFromApi(row)) };
}

export async function restUpdateDoseTaken(apiFetch: JsonApiFetch, doseEventId: string) {
  return apiFetch(`/patient/dose-events/${doseEventId}/take`, { method: 'POST' });
}

export async function restUpdateDoseSkipped(apiFetch: JsonApiFetch, doseEventId: string, note?: string) {
  return apiFetch(`/patient/dose-events/${doseEventId}/skip`, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {})
  });
}

export async function restSnoozeDose(apiFetch: JsonApiFetch, doseEventId: string, minutes: number) {
  return apiFetch(`/patient/dose-events/${doseEventId}/snooze`, {
    method: 'POST',
    body: JSON.stringify({ minutes })
  });
}

export async function restFetchReminderPreferences(apiFetch: JsonApiFetch) {
  return apiFetch<{ preferences: ReminderPreferencePayload }>('/patient/reminder-preferences');
}

export async function restUpdateReminderPreferences(apiFetch: JsonApiFetch, preferences: ReminderPreferencePayload) {
  return apiFetch('/patient/reminder-preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences)
  });
}

export async function restFetchDoctors(apiFetch: JsonApiFetch) {
  return apiFetch<{ doctors: Doctor[] }>('/admin/doctors');
}

export type PatientSelfDiagnosisResultRow = {
  toolKey: string;
  answers: Record<string, string>;
  updatedAt: string;
};

export async function restFetchPatientSelfDiagnosis(apiFetch: JsonApiFetch) {
  return apiFetch<{ results: PatientSelfDiagnosisResultRow[] }>('/patient/self-diagnosis');
}

export async function restUpsertPatientSelfDiagnosis(
  apiFetch: JsonApiFetch,
  toolKey: string,
  answers: Record<string, string>
) {
  return apiFetch<{ result: PatientSelfDiagnosisResultRow; message: string }>(
    `/patient/self-diagnosis/${encodeURIComponent(toolKey)}`,
    { method: 'PUT', body: JSON.stringify({ answers }) }
  );
}
