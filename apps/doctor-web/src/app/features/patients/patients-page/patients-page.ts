import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { PatientsApiService, type PatientIdCardData, type PatientSearchResult } from '../patients-api.service';
import { PatientIdCardComponent } from '../patient-id-card/patient-id-card';

type DoseEvent = {
  id: string;
  status: 'SKIPPED' | 'MISSED';
  scheduledFor: string;
  interactedAt: string | null;
  note: string | null;
  medicineName: string;
};

type WorklistConsultation = {
  id: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'PRESCRIPTION_UPLOADED' | 'COMPLETED' | string;
  createdAt: string;
  patient?: { id: string; name: string; mobile?: string | null; patientCode?: string | null };
  disease?: { name?: string };
  prescriptions?: Array<{
    id: string;
    version: number;
    status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
    followUpDate?: string | null;
    createdAt: string;
  }>;
};

@Component({
  selector: 'app-patients-page',
  imports: [FormsModule, CommonModule, DatePipe, PatientIdCardComponent],
  templateUrl: './patients-page.html',
  styleUrl: './patients-page.scss'
})
export class PatientsPage {
  private readonly apiBase = environment.apiUrl;
  worklistLoading = false;
  worklistError = '';
  consultations: WorklistConsultation[] = [];
  worklistSearch = '';
  worklistView: 'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'FOLLOW_UP_DUE' = 'ALL';

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
    private readonly router: Router,
    private readonly patientsApi: PatientsApiService
  ) {
    void this.loadWorklist();
  }

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
    void this.loadPatientCard(patient.id);
    void this.loadTrend();
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
    const id = this.patientId.trim();
    if (!id) {
      this.error = 'Select or enter a patient.';
      return;
    }

    this.loading = true;
    this.doseEventsLoading = true;
    this.doseEventsError = '';

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
  }

  async loadWorklist() {
    this.worklistError = '';
    this.worklistLoading = true;
    try {
      const response = await firstValueFrom(
        this.http.get<{ consultations: WorklistConsultation[] }>(`${this.apiBase}${API_PATHS.CONSULTATIONS}`)
      );
      this.consultations = response.consultations || [];
    } catch {
      this.worklistError = 'Could not load doctor worklist.';
    } finally {
      this.worklistLoading = false;
    }
  }

  private normalizedSearch() {
    return this.worklistSearch.trim().toLowerCase();
  }

  private matchesSearch(item: WorklistConsultation) {
    const needle = this.normalizedSearch();
    if (!needle) {
      return true;
    }

    const haystack = [
      item.patient?.name || '',
      item.patient?.id || '',
      item.patient?.patientCode || '',
      item.patient?.mobile || '',
      item.disease?.name || '',
      item.status || ''
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  }

  assignedCases() {
    return this.consultations.filter((item) => item.status === 'ASSIGNED' && this.matchesSearch(item));
  }

  inProgressCases() {
    return this.consultations.filter(
      (item) => (item.status === 'IN_PROGRESS' || item.status === 'PRESCRIPTION_UPLOADED') && this.matchesSearch(item)
    );
  }

  followUpDueCases() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return this.consultations.filter((item) => {
      const published = (item.prescriptions || []).find((p) => p.status === 'PUBLISHED');
      if (!published?.followUpDate) {
        return false;
      }
      return new Date(published.followUpDate) <= today && item.status !== 'COMPLETED' && this.matchesSearch(item);
    });
  }

  publishedFollowUpDate(item: WorklistConsultation) {
    return (item.prescriptions || []).find((p) => p.status === 'PUBLISHED')?.followUpDate || null;
  }

  openInAppointments(consultationId: string) {
    void this.router.navigate(['/', ROUTE_PATHS.APPOINTMENTS], { queryParams: { consultationId } });
  }

  showSection(section: 'ASSIGNED' | 'IN_PROGRESS' | 'FOLLOW_UP_DUE') {
    return this.worklistView === 'ALL' || this.worklistView === section;
  }

  followUpUrgency(item: WorklistConsultation) {
    const followUpDate = this.publishedFollowUpDate(item);
    if (!followUpDate) {
      return 'NORMAL';
    }

    const now = new Date();
    const due = new Date(followUpDate);
    const today = new Date(now);
    today.setHours(23, 59, 59, 999);
    if (due < now) {
      return 'OVERDUE';
    }
    if (due <= today) {
      return 'DUE_TODAY';
    }
    return 'NORMAL';
  }
}
