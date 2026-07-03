import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { PatientsApiService, type PatientIdCardData, type PatientSearchResult } from '../patients-api.service';
import { PatientIdCardComponent } from '../patient-id-card/patient-id-card';
import {
  PatientHealthProfileComponent,
  type PatientClinicalProfile
} from '../../../shared/patient-health-profile/patient-health-profile';

type DoseEvent = {
  id: string;
  status: 'SKIPPED' | 'MISSED';
  scheduledFor: string;
  interactedAt: string | null;
  note: string | null;
  medicineName: string;
};

type LabReferralLine = {
  id: string;
  testName: string;
  testCode?: string | null;
  resultSummary?: string | null;
  resultFileUrl?: string | null;
  completedAt?: string | null;
};

type LabReferral = {
  id: string;
  referralNumber: string;
  status: string;
  clinicalNotes?: string | null;
  partnerNotes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  diagnosticCenter: { name: string; code: string };
  lines: LabReferralLine[];
  totals: { testCount: number; completedTests: number };
};

type AdherenceSummary = {
  patientId: string;
  days: number;
  totals: { total: number; taken: number; skipped: number; missed: number; pending: number };
  adherencePercent: number;
  trend: Array<{
    date: string;
    total: number;
    taken: number;
    skipped: number;
    missed: number;
    pending: number;
    adherencePercent: number;
  }>;
};

function emptyCreatePatientModel() {
  return { name: '', email: '', mobile: '' };
}

@Component({
  selector: 'app-patients-page',
  imports: [FormField, CommonModule, DatePipe, PatientIdCardComponent, RouterLink, PatientHealthProfileComponent],
  templateUrl: './patients-page.html',
  styleUrl: './patients-page.scss'
})
export class PatientsPage {
  private readonly http = inject(HttpClient);
  private readonly patientsApi = inject(PatientsApiService);
  private readonly apiBase = environment.apiUrl;

  readonly worklistPath = `/${ROUTE_PATHS.WORKLIST}`;

  readonly searchModel = signal({ patientSearchQuery: '', patientSearchScope: 'auto' as 'auto' | 'clinic' | 'global' });
  readonly searchForm = form(this.searchModel);
  readonly createPatientModel = signal(emptyCreatePatientModel());
  readonly createPatientForm = form(this.createPatientModel);
  readonly trendModel = signal({ patientId: '', days: '7' });
  readonly trendForm = form(this.trendModel);

  readonly patientSearchLoading = signal(false);
  readonly patientSearchError = signal('');
  readonly patientSearchHint = signal('');
  readonly patientSearchResults = signal<PatientSearchResult[]>([]);
  readonly selectedPatient = signal<PatientSearchResult | null>(null);
  readonly patientCard = signal<PatientIdCardData | null>(null);
  readonly patientCardLoading = signal(false);

  showCreatePatient = false;
  readonly createPatientSaving = signal(false);
  readonly createPatientError = signal('');

  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly doseEvents = signal<DoseEvent[]>([]);
  readonly doseEventsLoading = signal(false);
  readonly doseEventsError = signal('');
  readonly patientClinical = signal<PatientClinicalProfile | null>(null);
  readonly labReferrals = signal<LabReferral[]>([]);
  readonly labReferralsLoading = signal(false);
  readonly labReferralsError = signal('');
  readonly summary = signal<AdherenceSummary | null>(null);

  async searchPatients(forceGlobal = false) {
    this.patientSearchError.set('');
    this.patientSearchHint.set('');
    this.patientSearchResults.set([]);
    this.selectedPatient.set(null);
    const { patientSearchQuery, patientSearchScope } = this.searchModel();
    const q = patientSearchQuery.trim();
    if (q.length < 2) {
      this.patientSearchError.set('Enter mobile, email, patient ID, or name (min 2 chars).');
      return;
    }

    this.patientSearchLoading.set(true);
    try {
      const scope = forceGlobal ? 'global' : patientSearchScope;
      const response = await this.patientsApi.searchPatients(q, scope);
      this.patientSearchResults.set(response.patients);
      this.patientSearchHint.set(
        response.hint ||
          (response.scopeUsed === 'clinic'
            ? 'Showing patients from your clinic branch.'
            : response.scopeUsed === 'global'
              ? 'Showing patients from all branches.'
              : '')
      );
      if (!response.patients.length && scope !== 'global') {
        this.patientSearchHint.set('No patients at your clinic. Try global search.');
      }
    } catch {
      this.patientSearchError.set('Could not search patients.');
    } finally {
      this.patientSearchLoading.set(false);
    }
  }

  selectPatient(patient: PatientSearchResult) {
    this.selectedPatient.set(patient);
    this.trendModel.update((model) => ({ ...model, patientId: patient.id }));
    this.patientClinical.set({
      allergies: patient.allergies,
      currentMedications: patient.currentMedications,
      chronicConditions: patient.chronicConditions
    });
    void this.loadPatientCard(patient.id);
    void this.loadTrend();
  }

  private async loadPatientClinical(patientId: string) {
    try {
      const response = await this.patientsApi.getPatient(patientId);
      const patient = response.patient;
      this.patientClinical.set({
        allergies: patient.allergies,
        currentMedications: patient.currentMedications,
        chronicConditions: patient.chronicConditions
      });
    } catch {
      this.patientClinical.set(null);
    }
  }

  private async loadPatientCard(patientId: string) {
    this.patientCardLoading.set(true);
    this.patientCard.set(null);
    try {
      const response = await this.patientsApi.getPatientCard(patientId);
      this.patientCard.set(response.card);
    } catch {
      const selected = this.selectedPatient();
      if (selected?.patientCode) {
        this.patientCard.set({
          patientCode: selected.patientCode,
          name: selected.name,
          mobile: selected.mobile,
          email: selected.email,
          clinic: selected.homeClinicStore ?? null,
          issuedAt: new Date().toISOString()
        });
      }
    } finally {
      this.patientCardLoading.set(false);
    }
  }

  async createPatient() {
    this.createPatientError.set('');
    const { name, email, mobile } = this.createPatientModel();
    const trimmedName = name.trim();
    if (!trimmedName) {
      this.createPatientError.set('Name is required.');
      return;
    }
    this.createPatientSaving.set(true);
    try {
      const response = await this.patientsApi.createPatient({
        name: trimmedName,
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined
      });
      this.message.set(`Patient created: ${response.patient.patientCode || response.patient.id}`);
      this.showCreatePatient = false;
      this.createPatientModel.set(emptyCreatePatientModel());
      this.patientSearchResults.set([response.patient]);
      this.selectPatient(response.patient);
      if (response.patient.patientCode) {
        this.patientCard.set({
          patientCode: response.patient.patientCode,
          name: response.patient.name,
          mobile: response.patient.mobile,
          email: response.patient.email,
          clinic: response.patient.homeClinicStore ?? null,
          issuedAt: new Date().toISOString()
        });
      }
    } catch {
      this.createPatientError.set('Could not create patient. Check email is not already used.');
    } finally {
      this.createPatientSaving.set(false);
    }
  }

  async loadTrend() {
    this.error.set('');
    this.message.set('');
    this.summary.set(null);
    this.doseEvents.set([]);
    this.labReferrals.set([]);
    this.labReferralsError.set('');
    const { patientId, days: daysStr } = this.trendModel();
    const days = Number(daysStr) as 7 | 30;
    const id = patientId.trim();
    if (!id) {
      this.error.set('Select or enter a patient.');
      return;
    }

    this.loading.set(true);
    this.doseEventsLoading.set(true);
    this.doseEventsError.set('');
    void this.loadPatientClinical(id);

    const params = { days: String(days) };

    const [trendResult, eventsResult] = await Promise.allSettled([
      firstValueFrom(
        this.http.get<AdherenceSummary>(`${this.apiBase}${API_PATHS.PATIENTS.ADHERENCE_TREND(id)}`, { params })
      ),
      firstValueFrom(
        this.http.get<{ events: DoseEvent[] }>(`${this.apiBase}${API_PATHS.PATIENTS.DOSE_EVENTS(id)}`, { params })
      )
    ]);

    this.loading.set(false);
    this.doseEventsLoading.set(false);

    if (trendResult.status === 'fulfilled') {
      this.summary.set(trendResult.value);
      this.message.set(`Loaded ${days}-day adherence trend.`);
    } else {
      this.error.set('Could not load adherence trend for this patient.');
    }

    if (eventsResult.status === 'fulfilled') {
      this.doseEvents.set(eventsResult.value.events || []);
    } else {
      this.doseEventsError.set('Could not load dose notes.');
    }

    void this.loadLabReferrals(id);
  }

  private async loadLabReferrals(patientId: string) {
    this.labReferralsLoading.set(true);
    this.labReferralsError.set('');
    this.labReferrals.set([]);
    try {
      const response = await firstValueFrom(
        this.http.get<{ referrals: LabReferral[] }>(`${this.apiBase}${API_PATHS.PATIENTS.LAB_REFERRALS(patientId)}`)
      );
      this.labReferrals.set(response.referrals || []);
    } catch {
      this.labReferralsError.set('Could not load lab referrals.');
    } finally {
      this.labReferralsLoading.set(false);
    }
  }

  labStatusClass(status: string) {
    if (status === 'RESULT_READY') return 'lab-status ready';
    if (status === 'CANCELLED') return 'lab-status cancelled';
    return 'lab-status pending';
  }
}
