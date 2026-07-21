import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { adminRouteLink, ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import {
  buildDetailRows,
  PATIENT_CLINICAL_PROFILE_FIELDS,
  patientClinicalProfileHasData,
} from '@hopehub/platform-ui';
import { AdminApi } from '../../../core/services/admin-api';
import { AdminMobileLayoutService } from '../../../core/services/admin-mobile-layout.service';
import { ViewportService } from '@hopehub/platform-ui';
import {
  CONSUMERS_LIST_DEFAULTS,
  CONSUMERS_PAGE_SIZE,
  type ConsumerSortField,
} from '../constants/consumers-list.constants';
import { type SortDirection } from '../../../shared/constants/filter.constants';
import { type PatientIdCardData } from '@hopehub/platform-ui';
import { environment } from '../../../../environments/environment';
import { buildAdminClinicalSummary, type ClinicalSummaryRow } from '@hopehub/homeopathy-approaches';
import { type SupportNoteCategory } from '../constants/support-note.constants';
import { SUPPORT_ACCOUNT_FIELDS } from '../constants/support-detail.fields';
import {
  CONSUMER_ADHERENCE_FIELDS,
  REMINDER_PREFERENCE_FIELDS,
} from '../constants/consumer-support-detail.fields';
import {
  type ActiveDoctor,
  type ClinicalSummary,
  type Consumer,
  type ConsumerDetail,
  type SupportContext,
  type SupportNote,
} from '../models/consumers.models';
import { ConsumersListPanelComponent } from '../components/consumers-list-panel/consumers-list-panel';
import { ConsumerOverviewPanelComponent } from '../components/consumer-overview-panel/consumer-overview-panel';
import { ConsumerSupportPanelComponent } from '../components/consumer-support-panel/consumer-support-panel';

@Component({
  selector: 'app-consumers-page',
  imports: [
    CommonModule,
    ConsumersListPanelComponent,
    ConsumerOverviewPanelComponent,
    ConsumerSupportPanelComponent,
  ],
  templateUrl: './consumers-page.html',
  styleUrl: './consumers-page.scss',
})
export class ConsumersPage implements OnDestroy {
  private readonly viewport = inject(ViewportService);
  private readonly mobileLayout = inject(AdminMobileLayoutService);

  readonly isMobile = computed(() => this.viewport.isMobile());
  readonly showListPanel = computed(() => !this.isMobile() || !this.selectedConsumerId);
  readonly showDetailPanel = computed(() => !this.isMobile() || !!this.selectedConsumerId);

  consumers: Consumer[] = [];
  selectedConsumerId = '';
  consumerDetail: ConsumerDetail | null = null;
  listLoading = false;
  detailLoading = false;
  readonly listFilterModel = signal({
    searchTerm: '',
    sortBy: CONSUMERS_LIST_DEFAULTS.SORT_BY as ConsumerSortField,
    sortDirection: CONSUMERS_LIST_DEFAULTS.SORT_DIRECTION as SortDirection,
  });
  readonly listFilterForm = form(this.listFilterModel);
  pageSize = CONSUMERS_PAGE_SIZE;
  page = 1;
  totalPagesCount = 1;
  listError = '';
  detailError = '';

  activeDoctors: ActiveDoctor[] = [];
  assigningConsultationId = '';
  readonly assignModel = signal({ doctorId: '' });
  readonly assignForm = form(this.assignModel);
  assignError = '';
  assigning = false;

  detailTab: 'overview' | 'support' = 'overview';
  supportLoading = false;
  supportError = '';
  supportNotes: SupportNote[] = [];
  supportContext: SupportContext | null = null;
  readonly noteModel = signal({
    category: 'GENERAL' as SupportNoteCategory,
    body: '',
    consultationId: '',
  });
  readonly noteForm = form(this.noteModel);
  savingNote = false;
  noteError = '';

  showRegister = false;
  readonly registerModel = signal({ name: '', email: '', mobile: '', homeClinicStoreId: '' });
  readonly registerForm = form(this.registerModel);
  registerSaving = false;
  registerError = '';
  registerMessage = '';
  readonly patientSearchModel = signal({ q: '' });
  readonly patientSearchForm = form(this.patientSearchModel);
  patientSearchLoading = false;
  patientSearchResults: Array<{ id: string; name: string; patientCode?: string; mobile?: string }> =
    [];
  stores: Array<{ id: string; name: string; code: string }> = [];

  readonly clinicalRecordsRoute = adminRouteLink(ROUTE_PATHS.CLINICAL_RECORDS);

  clinicalSummary: ClinicalSummary | null = null;
  clinicalSummaryLoading = false;

  constructor(
    private readonly api: AdminApi,
    private readonly route: ActivatedRoute,
  ) {
    const consumerId = this.route.snapshot.queryParamMap.get('consumerId');
    const patientCode = this.route.snapshot.queryParamMap.get('patientCode');
    if (consumerId) {
      this.selectedConsumerId = consumerId;
    }
    if (patientCode) {
      this.patientSearchModel.set({ q: patientCode });
      void this.searchPatientsGlobal();
    }
    void this.load();
    void this.loadDoctors();
    void this.loadStores();
  }

  private async loadStores() {
    try {
      const response = await this.api.getAdminStores();
      this.stores = (response.stores || []).map(
        (store: { id: string; name: string; code: string }) => ({
          id: store.id,
          name: store.name,
          code: store.code,
        }),
      );
    } catch {
      this.stores = [];
    }
  }

  private async loadDoctors() {
    try {
      const res = await this.api.getActiveDoctors();
      this.activeDoctors = res.doctors || [];
    } catch {
      // non-critical; assignment dropdown will just be empty
    }
  }

  startAssign(consultationId: string) {
    this.assigningConsultationId = consultationId;
    this.assignModel.set({ doctorId: this.activeDoctors[0]?.id || '' });
    this.assignError = '';
  }

  cancelAssign() {
    this.assigningConsultationId = '';
    this.assignModel.set({ doctorId: '' });
    this.assignError = '';
  }

  async confirmAssign() {
    const doctorId = this.assignModel().doctorId;
    if (!this.assigningConsultationId || !doctorId) return;
    this.assigning = true;
    this.assignError = '';
    try {
      await this.api.assignDoctor(this.assigningConsultationId, doctorId);
      this.assigningConsultationId = '';
      this.assignModel.set({ doctorId: '' });
      if (this.selectedConsumerId) {
        await Promise.all([
          this.loadConsumerDetail(this.selectedConsumerId),
          this.loadSupport(this.selectedConsumerId),
        ]);
      }
    } catch {
      this.assignError = 'Could not assign doctor. Please try again.';
    } finally {
      this.assigning = false;
    }
  }

  async load() {
    this.listLoading = true;
    this.listError = '';
    try {
      const filters = this.listFilterModel();
      const response = await this.api.getConsumersPaged({
        page: this.page,
        pageSize: this.pageSize,
        q: filters.searchTerm,
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection,
      });
      this.consumers = response.consumers || [];
      this.totalPagesCount = Math.max(1, Number(response.pagination?.totalPages || 1));
      if (!this.selectedConsumerId && !this.isMobile()) {
        this.selectedConsumerId = this.consumers[0]?.id || '';
      }
      if (this.selectedConsumerId) {
        await Promise.all([
          this.loadConsumerDetail(this.selectedConsumerId),
          this.loadSupport(this.selectedConsumerId),
        ]);
        if (this.isMobile()) {
          this.mobileLayout.setPageFocus(true);
        }
      } else {
        this.consumerDetail = null;
      }
    } catch {
      this.listError = 'Could not load consumers.';
    } finally {
      this.listLoading = false;
    }
  }

  async setPage(page: number) {
    this.page = page;
    await this.load();
  }

  visibleConsumers() {
    return this.consumers;
  }

  pages() {
    return Array.from({ length: this.totalPagesCount }, (_, index) => index + 1);
  }

  async selectConsumer(consumerId: string) {
    this.selectedConsumerId = consumerId;
    this.detailTab = 'overview';
    if (this.isMobile()) {
      this.mobileLayout.setPageFocus(true);
    }
    await Promise.all([this.loadConsumerDetail(consumerId), this.loadSupport(consumerId)]);
  }

  clearConsumerSelection() {
    this.selectedConsumerId = '';
    this.consumerDetail = null;
    this.detailError = '';
    this.mobileLayout.clearPageFocus();
  }

  ngOnDestroy(): void {
    this.mobileLayout.clearPageFocus();
  }

  setDetailTab(tab: 'overview' | 'support') {
    this.detailTab = tab;
  }

  async loadSupport(consumerId: string) {
    this.supportLoading = true;
    this.supportError = '';
    try {
      const response = await this.api.getConsumerSupport(consumerId);
      this.supportNotes = response.notes || [];
      this.supportContext = response.context || null;
    } catch {
      this.supportError = 'Could not load support context.';
      this.supportNotes = [];
      this.supportContext = null;
    } finally {
      this.supportLoading = false;
    }
  }

  async submitSupportNote() {
    if (!this.selectedConsumerId) return;
    const note = this.noteModel();
    const body = note.body.trim();
    if (body.length < 2) {
      this.noteError = 'Enter at least 2 characters.';
      return;
    }
    this.savingNote = true;
    this.noteError = '';
    try {
      await this.api.addConsumerSupportNote(this.selectedConsumerId, {
        category: note.category,
        body,
        consultationId: note.consultationId || undefined,
      });
      this.noteModel.set({ category: 'GENERAL', body: '', consultationId: '' });
      await this.loadSupport(this.selectedConsumerId);
    } catch {
      this.noteError = 'Could not save support note.';
    } finally {
      this.savingNote = false;
    }
  }

  private async loadConsumerDetail(consumerId: string) {
    this.detailLoading = true;
    this.detailError = '';
    try {
      const detail = (await this.api.getConsumerDetail(consumerId)) as ConsumerDetail;
      this.consumerDetail = detail;
      await this.loadClinicalSummary(consumerId);
    } catch {
      this.detailError = 'Could not load consumer details.';
      this.consumerDetail = null;
      this.clinicalSummary = null;
    } finally {
      this.detailLoading = false;
    }
  }

  private async loadClinicalSummary(patientId: string) {
    this.clinicalSummaryLoading = true;
    try {
      const [rxRes, analysisRes] = await Promise.all([
        this.api.listAdminPrescriptions({ patientId, pageSize: 5 }),
        this.api.listAdminCaseAnalyses({ patientId, pageSize: 5 }),
      ]);

      const analysisItems = (analysisRes.analyses || []) as Array<{
        id: string;
        status: string;
        createdAt: string;
        methodOption?: { label: string } | null;
        selectedRemedy?: { name: string } | null;
        doctor?: { name: string } | null;
      }>;

      const analyses = await Promise.all(
        analysisItems.map(async (item) => {
          const base = {
            id: item.id,
            status: item.status,
            createdAt: item.createdAt,
            methodOption: item.methodOption ?? null,
            selectedRemedy: item.selectedRemedy ?? null,
            doctor: item.doctor ?? null,
            approachTitle: item.methodOption?.label || 'Case analysis',
            caseSheetRows: [] as ClinicalSummaryRow[],
            approachRows: [] as ClinicalSummaryRow[],
          };

          try {
            const { analysis } = await this.api.getAdminCaseAnalysis(item.id);
            const detail = analysis as {
              caseSheet?: unknown;
              approachData?: unknown;
              methodOption?: { label: string } | null;
            };
            const summary = buildAdminClinicalSummary({
              methodLabel: detail.methodOption?.label ?? item.methodOption?.label,
              caseSheet: detail.caseSheet,
              approachData: detail.approachData,
            });
            return {
              ...base,
              approachTitle: summary.approachTitle,
              caseSheetRows: summary.caseSheetRows,
              approachRows: summary.approachRows,
            };
          } catch {
            return base;
          }
        }),
      );

      this.clinicalSummary = {
        prescriptions: (rxRes.prescriptions || []) as ClinicalSummary['prescriptions'],
        analyses,
        prescriptionTotal: rxRes.pagination?.total ?? 0,
        analysisTotal: analysisRes.pagination?.total ?? 0,
      };
    } catch {
      this.clinicalSummary = null;
    } finally {
      this.clinicalSummaryLoading = false;
    }
  }

  patientIdCard(): PatientIdCardData | null {
    const consumer = this.consumerDetail?.consumer;
    if (!consumer?.patientCode) {
      return null;
    }
    return {
      patientCode: consumer.patientCode,
      name: consumer.name,
      mobile: consumer.mobile ?? null,
      email: consumer.email ?? null,
      issuedAt: new Date().toISOString(),
      scanUrl: `${environment.apiUrl}/go/p/${encodeURIComponent(consumer.patientCode)}`,
    };
  }

  async searchPatientsGlobal() {
    const q = this.patientSearchModel().q.trim();
    if (q.length < 2) return;
    this.patientSearchLoading = true;
    try {
      const response = await this.api.searchPatients(q, { scope: 'global' });
      this.patientSearchResults = response.patients || [];
    } catch {
      this.patientSearchResults = [];
    } finally {
      this.patientSearchLoading = false;
    }
  }

  selectSearchedPatient(patientId: string) {
    void this.selectConsumer(patientId);
    this.patientSearchResults = [];
    this.patientSearchModel.set({ q: '' });
  }

  async registerPatient() {
    this.registerError = '';
    this.registerMessage = '';
    const form = this.registerModel();
    const name = form.name.trim();
    if (!name) {
      this.registerError = 'Name is required.';
      return;
    }
    this.registerSaving = true;
    try {
      const response = await this.api.registerPatient({
        name,
        email: form.email.trim() || undefined,
        mobile: form.mobile.trim() || undefined,
        homeClinicStoreId: form.homeClinicStoreId || null,
      });
      this.registerMessage = `Patient registered: ${response.patient.patientCode || response.patient.id}`;
      this.registerModel.set({ name: '', email: '', mobile: '', homeClinicStoreId: '' });
      this.showRegister = false;
      await this.load();
      if (response.patient.id) {
        await this.selectConsumer(response.patient.id);
      }
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && 'error' in e
          ? (e as { error?: { message?: string } }).error?.message
          : undefined;
      this.registerError = message || 'Could not register patient.';
    } finally {
      this.registerSaving = false;
    }
  }

  clinicalProfileRows(consumer: ConsumerDetail['consumer']) {
    return buildDetailRows(consumer, PATIENT_CLINICAL_PROFILE_FIELDS);
  }

  clinicalProfileHasData(consumer: ConsumerDetail['consumer']) {
    return patientClinicalProfileHasData(consumer);
  }

  supportAccountRows(ctx: SupportContext) {
    return buildDetailRows(
      {
        isActive: ctx.account.isActive,
        adherencePercent: ctx.adherenceSummary.percent,
        adherenceTaken: ctx.adherenceSummary.taken,
        adherenceTotal: ctx.adherenceSummary.total,
      },
      SUPPORT_ACCOUNT_FIELDS,
    );
  }

  adherenceRows(adherence: ConsumerDetail['adherence']) {
    return buildDetailRows(adherence, CONSUMER_ADHERENCE_FIELDS);
  }

  reminderPreferenceRows(prefs: NonNullable<SupportContext['reminderPreferences']>) {
    return buildDetailRows(prefs, REMINDER_PREFERENCE_FIELDS);
  }
}
