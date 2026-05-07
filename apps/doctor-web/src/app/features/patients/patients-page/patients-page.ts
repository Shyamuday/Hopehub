import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

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
  patient?: { id: string; name: string; mobile?: string | null };
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
  imports: [FormsModule, CommonModule, DatePipe],
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
    private readonly router: Router
  ) {
    void this.loadWorklist();
  }

  async loadTrend() {
    this.error = '';
    this.message = '';
    this.summary = null;
    this.doseEvents = [];
    const id = this.patientId.trim();
    if (!id) {
      this.error = 'Enter patient ID.';
      return;
    }

    this.loading = true;
    this.doseEventsLoading = true;
    this.doseEventsError = '';

    const params = { days: String(this.days) };

    const [trendResult, eventsResult] = await Promise.allSettled([
      firstValueFrom(
        this.http.get<PatientsPage['summary']>(`${this.apiBase}/doctor/patients/${id}/adherence-trend`, { params })
      ),
      firstValueFrom(
        this.http.get<{ events: DoseEvent[] }>(`${this.apiBase}/doctor/patients/${id}/dose-events`, { params })
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
        this.http.get<{ consultations: WorklistConsultation[] }>(`${this.apiBase}/consultations`)
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
    void this.router.navigate(['/appointments'], { queryParams: { consultationId } });
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
