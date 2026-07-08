import { buildDetailRows, DetailRowsComponent } from '@vitalis/platform-ui';
import type { DetailFieldDef } from '@vitalis/platform-ui';
import { buildAdminClinicalSummary } from '@vitalis/homeopathy-approaches';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminApi } from '../../../core/services/admin-api';
import { AdminMobileLayoutService } from '../../../core/services/admin-mobile-layout.service';
import { ViewportService } from '../../../core/services/viewport.service';

type MethodOption = { id: string; label: string };
type PublicUser = { id: string; name: string; mobile?: string | null; patientCode?: string | null };
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

type PrescriptionListItem = {
  id: string;
  consultationId: string | null;
  patientId: string;
  uploadedById: string;
  caseAnalysisId: string | null;
  status: string;
  diagnosis: string | null;
  advice: string | null;
  notes: string | null;
  followUpDate: string | null;
  createdAt: string;
  patient: PublicUser;
  doctor: PublicUser;
  methodOption: MethodOption | null;
  diagnosedDiseaseOption: { label: string } | null;
  consultation: { disease?: { name: string } | null } | null;
  caseAnalysis: { id: string; status: string; methodOption?: MethodOption | null } | null;
  itemCount: number;
};

type PrescriptionDetail = PrescriptionListItem & {
  items: Array<{
    medicineName: string;
    strength?: string | null;
    dose?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instructions?: string | null;
  }>;
  assignedDoctor?: PublicUser | null;
};

type CaseAnalysisListItem = {
  id: string;
  consultationId: string | null;
  doctorId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  methodOption: MethodOption | null;
  selectedRemedy: { name: string; abbreviation?: string | null } | null;
  doctor: PublicUser | null;
  consultation: {
    patient: PublicUser;
    disease?: { name: string } | null;
  } | null;
  rubricCount: number;
  resultCount: number;
  prescriptionCount: number;
};

type CaseAnalysisDetail = CaseAnalysisListItem & {
  caseSheet: unknown;
  approachData: unknown;
  intakeAnswers?: unknown;
  assignedDoctor?: PublicUser | null;
  source?: { name: string } | null;
  rubrics: Array<{
    weight: number;
    rubric: { chapter?: string | null; text: string };
  }>;
  results: Array<{
    rank: number;
    score: number;
    remedy: { name: string; abbreviation?: string | null };
  }>;
  prescriptions: Array<{
    id: string;
    diagnosis: string | null;
    status: string;
    createdAt: string;
    methodOption?: MethodOption | null;
  }>;
};

const PRESCRIPTION_SUMMARY_FIELDS: DetailFieldDef<PrescriptionDetail>[] = [
  { label: 'Patient', getValue: (p) => p.patient?.name },
  { label: 'Patient code', getValue: (p) => p.patient?.patientCode, omitWhenEmpty: true },
  { label: 'Prescribing doctor', getValue: (p) => p.doctor?.name },
  { label: 'Assigned doctor', getValue: (p) => p.assignedDoctor?.name, omitWhenEmpty: true },
  { label: 'Approach / method', getValue: (p) => p.methodOption?.label },
  { label: 'Diagnosed disease', getValue: (p) => p.diagnosedDiseaseOption?.label, omitWhenEmpty: true },
  { label: 'Consultation disease', getValue: (p) => p.consultation?.disease?.name, omitWhenEmpty: true },
  { label: 'Status', getValue: (p) => p.status },
  { label: 'Diagnosis', getValue: (p) => p.diagnosis, omitWhenEmpty: true },
  { label: 'Advice', getValue: (p) => p.advice, omitWhenEmpty: true },
  { label: 'Notes', getValue: (p) => p.notes, omitWhenEmpty: true },
  { label: 'Follow-up', getValue: (p) => p.followUpDate, omitWhenEmpty: true },
  { label: 'Linked analysis', getValue: (p) => p.caseAnalysisId, omitWhenEmpty: true },
  { label: 'Consultation', getValue: (p) => p.consultationId, omitWhenEmpty: true }
];

const ANALYSIS_SUMMARY_FIELDS: DetailFieldDef<CaseAnalysisDetail>[] = [
  { label: 'Patient', getValue: (a) => a.consultation?.patient?.name },
  { label: 'Patient code', getValue: (a) => a.consultation?.patient?.patientCode, omitWhenEmpty: true },
  { label: 'Analysis doctor', getValue: (a) => a.doctor?.name },
  { label: 'Assigned doctor', getValue: (a) => a.assignedDoctor?.name, omitWhenEmpty: true },
  { label: 'Approach / method', getValue: (a) => a.methodOption?.label },
  { label: 'Repertory source', getValue: (a) => a.source?.name, omitWhenEmpty: true },
  { label: 'Selected remedy', getValue: (a) => a.selectedRemedy?.name, omitWhenEmpty: true },
  { label: 'Consultation disease', getValue: (a) => a.consultation?.disease?.name, omitWhenEmpty: true },
  { label: 'Status', getValue: (a) => a.status },
  { label: 'Notes', getValue: (a) => a.notes, omitWhenEmpty: true },
  { label: 'Rubrics', getValue: (a) => a.rubrics?.length },
  { label: 'Results', getValue: (a) => a.results?.length },
  { label: 'Linked prescriptions', getValue: (a) => a.prescriptions?.length },
  { label: 'Consultation', getValue: (a) => a.consultationId, omitWhenEmpty: true }
];

@Component({
  selector: 'app-clinical-records-page',
  imports: [FormField, DatePipe, DetailRowsComponent],
  templateUrl: './clinical-records-page.html',
  styleUrl: './clinical-records-page.scss'
})
export class ClinicalRecordsPage implements OnInit, OnDestroy {
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportService);
  private readonly mobileLayout = inject(AdminMobileLayoutService);

  readonly tab = signal<'prescriptions' | 'analyses'>('prescriptions');
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly error = signal('');

  readonly prescriptions = signal<PrescriptionListItem[]>([]);
  readonly analyses = signal<CaseAnalysisListItem[]>([]);
  readonly pagination = signal<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });

  readonly selectedPrescription = signal<PrescriptionDetail | null>(null);
  readonly selectedAnalysis = signal<CaseAnalysisDetail | null>(null);

  readonly isMobile = computed(() => this.viewport.isMobile());
  readonly hasDetail = computed(() => !!(this.selectedPrescription() || this.selectedAnalysis()));
  readonly showListPane = computed(() => !this.isMobile() || !this.hasDetail());
  readonly showDetailPane = computed(() => !this.isMobile() || this.hasDetail());

  readonly doctors = signal<PublicUser[]>([]);
  readonly methodOptions = signal<MethodOption[]>([]);
  readonly patientHits = signal<PublicUser[]>([]);
  readonly patientSearchLoading = signal(false);

  readonly filterModel = signal({
    q: '',
    doctorId: '',
    patientId: '',
    methodOptionId: '',
    status: '',
    patientSearch: '',
    consultationId: ''
  });
  readonly filterForm = form(this.filterModel);

  readonly selectedPatientLabel = computed(() => {
    const id = this.filterModel().patientId;
    if (!id) return '';
    const hit = this.patientHits().find((p) => p.id === id);
    if (hit) return `${hit.name}${hit.patientCode ? ` (${hit.patientCode})` : ''}`;
    const fromRx = this.prescriptions().find((p) => p.patientId === id)?.patient;
    if (fromRx) return fromRx.name;
    const fromAnalysis = this.analyses().find((a) => a.consultation?.patient?.id === id)?.consultation?.patient;
    if (fromAnalysis) return fromAnalysis.name;
    return id;
  });

  readonly prescriptionDetailRows = computed(() => {
    const item = this.selectedPrescription();
    return item ? buildDetailRows(item, PRESCRIPTION_SUMMARY_FIELDS) : [];
  });

  readonly analysisDetailRows = computed(() => {
    const item = this.selectedAnalysis();
    return item ? buildDetailRows(item, ANALYSIS_SUMMARY_FIELDS) : [];
  });

  readonly analysisClinicalSummary = computed(() => {
    const item = this.selectedAnalysis();
    if (!item) return null;
    return buildAdminClinicalSummary({
      methodLabel: item.methodOption?.label,
      caseSheet: item.caseSheet,
      approachData: item.approachData
    });
  });

  readonly analysisCaseSheetRows = computed(() => this.analysisClinicalSummary()?.caseSheetRows ?? []);
  readonly analysisApproachRows = computed(() => this.analysisClinicalSummary()?.approachRows ?? []);

  readonly prescriptionStatuses = ['', 'DRAFT', 'PUBLISHED', 'CANCELLED'];
  readonly analysisStatuses = ['', 'DRAFT', 'FINALIZED'];

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    void this.loadMeta();
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'analyses' || tab === 'prescriptions') this.tab.set(tab);
      const doctorId = params.get('doctorId') ?? '';
      const patientId = params.get('patientId') ?? '';
      const consultationId = params.get('consultationId') ?? '';
      if (doctorId || patientId || consultationId) {
        this.filterModel.update((m) => ({ ...m, doctorId, patientId, consultationId }));
      }
      void this.loadList(1);
    });
  }

  ngOnDestroy(): void {
    this.mobileLayout.clearPageFocus();
  }

  backToList() {
    this.selectedPrescription.set(null);
    this.selectedAnalysis.set(null);
    this.mobileLayout.clearPageFocus();
  }

  private syncMobileFocus() {
    if (this.isMobile() && this.hasDetail()) {
      this.mobileLayout.setPageFocus(true);
    } else if (this.isMobile()) {
      this.mobileLayout.clearPageFocus();
    }
  }

  async loadMeta() {
    try {
      const [doctors, methods] = await Promise.all([
        this.api.getActiveDoctors(),
        this.api.listClinicalMethodOptions()
      ]);
      this.doctors.set(doctors.doctors ?? []);
      this.methodOptions.set(methods.options);
    } catch {
      /* optional filters */
    }
  }

  setTab(tab: 'prescriptions' | 'analyses') {
    this.tab.set(tab);
    this.selectedPrescription.set(null);
    this.selectedAnalysis.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
    void this.loadList(1);
  }

  onFilterChange() {
    void this.loadList(1);
  }

  onSearchInput() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadList(1), 350);
  }

  async searchPatients() {
    const q = this.filterModel().patientSearch.trim();
    if (q.length < 2) {
      this.patientHits.set([]);
      return;
    }
    this.patientSearchLoading.set(true);
    try {
      const res = await this.api.searchPatients(q);
      this.patientHits.set((res.patients ?? res) as PublicUser[]);
    } catch {
      this.patientHits.set([]);
    } finally {
      this.patientSearchLoading.set(false);
    }
  }

  selectPatient(patient: PublicUser) {
    this.filterModel.update((m) => ({ ...m, patientId: patient.id, patientSearch: '' }));
    this.patientHits.set([]);
    void this.loadList(1);
  }

  clearPatientFilter() {
    this.filterModel.update((m) => ({ ...m, patientId: '', patientSearch: '' }));
    this.patientHits.set([]);
    void this.loadList(1);
  }

  clearConsultationFilter() {
    this.filterModel.update((m) => ({ ...m, consultationId: '' }));
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { consultationId: null },
      queryParamsHandling: 'merge'
    });
    void this.loadList(1);
  }

  async loadList(page = this.pagination().page) {
    this.loading.set(true);
    this.error.set('');
    const filters = this.filterModel();
    const params = {
      page,
      pageSize: 20,
      q: filters.q.trim(),
      doctorId: filters.doctorId,
      patientId: filters.patientId,
      methodOptionId: filters.methodOptionId,
      status: filters.status,
      consultationId: filters.consultationId
    };

    try {
      if (this.tab() === 'prescriptions') {
        const res = await this.api.listAdminPrescriptions(params);
        this.prescriptions.set(res.prescriptions as PrescriptionListItem[]);
        this.pagination.set(res.pagination);
      } else {
        const res = await this.api.listAdminCaseAnalyses(params);
        this.analyses.set(res.analyses as CaseAnalysisListItem[]);
        this.pagination.set(res.pagination);
      }
    } catch {
      this.error.set('Failed to load clinical records.');
    } finally {
      this.loading.set(false);
    }
  }

  async openPrescription(id: string) {
    this.detailLoading.set(true);
    this.selectedAnalysis.set(null);
    try {
      const res = await this.api.getAdminPrescription(id);
      this.selectedPrescription.set(res.prescription as PrescriptionDetail);
      this.syncMobileFocus();
    } catch {
      this.error.set('Failed to load prescription detail.');
    } finally {
      this.detailLoading.set(false);
    }
  }

  async openAnalysis(id: string) {
    this.detailLoading.set(true);
    this.selectedPrescription.set(null);
    try {
      const res = await this.api.getAdminCaseAnalysis(id);
      this.selectedAnalysis.set(res.analysis as CaseAnalysisDetail);
      this.syncMobileFocus();
    } catch {
      this.error.set('Failed to load case analysis detail.');
    } finally {
      this.detailLoading.set(false);
    }
  }

  openLinkedAnalysis() {
    const id = this.selectedPrescription()?.caseAnalysisId;
    if (!id) return;
    this.setTab('analyses');
    void this.openAnalysis(id);
  }

  openLinkedPrescription(id: string) {
    this.setTab('prescriptions');
    void this.openPrescription(id);
  }

  setPage(page: number) {
    void this.loadList(page);
  }
}
