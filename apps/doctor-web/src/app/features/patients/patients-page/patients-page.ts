import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-patients-page',
  imports: [FormsModule, CommonModule, DatePipe, PatientIdCardComponent, RouterLink, PatientHealthProfileComponent],
  templateUrl: './patients-page.html',
  styleUrl: './patients-page.scss'
})
export class PatientsPage {
  readonly worklistPath = `/${ROUTE_PATHS.WORKLIST}`;
  private readonly apiBase = environment.apiUrl;

  patientSearchQuery = '';
  patientSearchScope: 'auto' | 'clinic' | 'global' = 'auto';
  patientSearchLoading = false;
  patientSearchError = '';
  patientSearchHint = '';
  patientSearchResults: PatientSearchResult[] = [];
  selectedPatient: PatientSearchResult | null = null;
  patientCard: PatientIdCardData | null = null;
  patientCardLoading = false;

  showCreatePatient = false;
  createPatientName = '';
  createPatientEmail = '';
  createPatientMobile = '';
  createPatientSaving = false;
  createPatientError = '';

  patientId = '';
  days: 7 | 30 = 7;
  loading = false;
  error = '';
  message = '';
  doseEvents: DoseEvent[] = [];
  doseEventsLoading = false;
  doseEventsError = '';
  patientClinical: PatientClinicalProfile | null = null;
  labReferrals: LabReferral[] = [];
  labReferralsLoading = false;
  labReferralsError = '';

  summary: {
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
  } | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly patientsApi: PatientsApiService
  ) {}

  async searchPatients(forceGlobal = false) {
    this.patientSearchError = '';
    this.patientSearchHint = '';
    this.patientSearchResults = [];
    this.selectedPatient = null;
    const q = this.patientSearchQuery.trim();
    if (q.length < 2) {
      this.patientSearchError = 'Enter mobile, email, patient ID, or name (min 2 chars).';
      return;
    }

    this.patientSearchLoading = true;
    try {
      const scope = forceGlobal ? 'global' : this.patientSearchScope;
      const response = await this.patientsApi.searchPatients(q, scope);
      this.patientSearchResults = response.patients;
      this.patientSearchHint = response.hint || (response.scopeUsed === 'clinic' ? 'Showing patients from your clinic branch.' : response.scopeUsed === 'global' ? 'Showing patients from all branches.' : '');
      if (!this.patientSearchResults.length && scope !== 'global') {
        this.patientSearchHint = 'No patients at your clinic. Try global search.';
      }
    } catch {
      this.patientSearchError = 'Could not search patients.';
    } finally {
      this.patientSearchLoading = false;
    }
  }

  selectPatient(patient: PatientSearchResult) {
    this.selectedPatient = patient;
    this.patientId = patient.id;
    this.patientClinical = {
      allergies: patient.allergies,
      currentMedications: patient.currentMedications,
      chronicConditions: patient.chronicConditions
    };
    void this.loadPatientCard(patient.id);
    void this.loadTrend();
  }

  private async loadPatientClinical(patientId: string) {
    try {
      const response = await this.patientsApi.getPatient(patientId);
      const patient = response.patient;
      this.patientClinical = {
        allergies: patient.allergies,
        currentMedications: patient.currentMedications,
        chronicConditions: patient.chronicConditions
      };
    } catch {
      this.patientClinical = null;
    }
  }

  private async loadPatientCard(patientId: string) {
    this.patientCardLoading = true;
    this.patientCard = null;
    try {
      const response = await this.patientsApi.getPatientCard(patientId);
      this.patientCard = response.card;
    } catch {
      if (this.selectedPatient?.patientCode) {
        this.patientCard = {
          patientCode: this.selectedPatient.patientCode,
          name: this.selectedPatient.name,
          mobile: this.selectedPatient.mobile,
          email: this.selectedPatient.email,
          clinic: this.selectedPatient.homeClinicStore ?? null,
          issuedAt: new Date().toISOString()
        };
      }
    } finally {
      this.patientCardLoading = false;
    }
  }

  async createPatient() {
    this.createPatientError = '';
    const name = this.createPatientName.trim();
    if (!name) {
      this.createPatientError = 'Name is required.';
      return;
    }
    this.createPatientSaving = true;
    try {
      const response = await this.patientsApi.createPatient({
        name,
        email: this.createPatientEmail.trim() || undefined,
        mobile: this.createPatientMobile.trim() || undefined
      });
      this.message = `Patient created: ${response.patient.patientCode || response.patient.id}`;
      this.showCreatePatient = false;
      this.createPatientName = '';
      this.createPatientEmail = '';
      this.createPatientMobile = '';
      this.patientSearchResults = [response.patient];
      this.selectPatient(response.patient);
      if (response.patient.patientCode) {
        this.patientCard = {
          patientCode: response.patient.patientCode,
          name: response.patient.name,
          mobile: response.patient.mobile,
          email: response.patient.email,
          clinic: response.patient.homeClinicStore ?? null,
          issuedAt: new Date().toISOString()
        };
      }
    } catch {
      this.createPatientError = 'Could not create patient. Check email is not already used.';
    } finally {
      this.createPatientSaving = false;
    }
  }

  async loadTrend() {
    this.error = '';
    this.message = '';
    this.summary = null;
    this.doseEvents = [];
    this.labReferrals = [];
    this.labReferralsError = '';
    const id = this.patientId.trim();
    if (!id) {
      this.error = 'Select or enter a patient.';
      return;
    }

    this.loading = true;
    this.doseEventsLoading = true;
    this.doseEventsError = '';
    void this.loadPatientClinical(id);

    const params = { days: String(this.days) };

    const [trendResult, eventsResult] = await Promise.allSettled([
      firstValueFrom(
        this.http.get<PatientsPage['summary']>(`${this.apiBase}${API_PATHS.PATIENTS.ADHERENCE_TREND(id)}`, { params })
      ),
      firstValueFrom(
        this.http.get<{ events: DoseEvent[] }>(`${this.apiBase}${API_PATHS.PATIENTS.DOSE_EVENTS(id)}`, { params })
      )
    ]);

    this.loading = false;
    this.doseEventsLoading = false;

    if (trendResult.status === 'fulfilled') {
      this.summary = trendResult.value;
      this.message = `Loaded ${this.days}-day adherence trend.`;
    } else {
      this.error = 'Could not load adherence trend for this patient.';
    }

    if (eventsResult.status === 'fulfilled') {
      this.doseEvents = eventsResult.value.events || [];
    } else {
      this.doseEventsError = 'Could not load dose notes.';
    }

    void this.loadLabReferrals(id);
  }

  private async loadLabReferrals(patientId: string) {
    this.labReferralsLoading = true;
    this.labReferralsError = '';
    this.labReferrals = [];
    try {
      const response = await firstValueFrom(
        this.http.get<{ referrals: LabReferral[] }>(`${this.apiBase}${API_PATHS.PATIENTS.LAB_REFERRALS(patientId)}`)
      );
      this.labReferrals = response.referrals || [];
    } catch {
      this.labReferralsError = 'Could not load lab referrals.';
    } finally {
      this.labReferralsLoading = false;
    }
  }

  labStatusClass(status: string) {
    if (status === 'RESULT_READY') return 'lab-status ready';
    if (status === 'CANCELLED') return 'lab-status cancelled';
    return 'lab-status pending';
  }
}
