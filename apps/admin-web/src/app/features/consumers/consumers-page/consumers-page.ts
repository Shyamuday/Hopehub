import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { AdminApi } from '../../../core/services/admin-api';
import {
  CONSUMERS_LIST_DEFAULTS,
  CONSUMERS_PAGE_SIZE,
  type ConsumerSortField
} from '../constants/consumers-list.constants';
import { type SortDirection } from '../../../shared/constants/filter.constants';
import { PatientIdCardComponent, type PatientIdCardData } from '../../../shared/patient-id-card/patient-id-card';
import { environment } from '../../../../environments/environment';
import {
  SUPPORT_NOTE_CATEGORIES,
  SUPPORT_NOTE_CATEGORY_STYLES,
  type SupportNoteCategory
} from '../constants/support-note.constants';

type Consumer = {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  patientCode?: string;
  consultations: number;
};

type ConsumerDetail = {
  consumer: {
    id: string;
    name: string;
    email?: string;
    mobile?: string;
    patientCode?: string;
    allergies?: string | null;
    currentMedications?: string | null;
    chronicConditions?: string | null;
  };
  consultations: Array<{
    id: string;
    status: string;
    createdAt: string;
    disease?: { name?: string };
    assignedDoctor?: { name?: string } | null;
    prescriptions?: Array<{ id: string; status?: string }>;
  }>;
  adherence: {
    total: number;
    taken: number;
    skipped: number;
    missed: number;
    percent: number;
  };
  doseNotes?: Array<{
    id: string;
    status: 'SKIPPED' | 'MISSED';
    scheduledFor: string;
    interactedAt: string | null;
    note: string | null;
    medicineName: string;
  }>;
};

type ActiveDoctor = {
  id: string;
  name: string;
  doctorProfile?: { specialty?: string } | null;
};

type SupportNote = {
  id: string;
  category: SupportNoteCategory;
  body: string;
  consultationId?: string | null;
  createdAt: string;
  author?: { name?: string; email?: string };
  consultation?: { id: string; status: string; disease?: { name?: string } } | null;
};

type SupportContext = {
  account: { isActive: boolean; patientCode?: string | null; mobile?: string | null; email?: string | null };
  reminderPreferences?: {
    inApp: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  } | null;
  consultations: Array<{
    id: string;
    status: string;
    diseaseName: string;
    doctorName?: string | null;
    paymentStatus?: string | null;
    prescriptionCount: number;
    messageCount: number;
    createdAt: string;
  }>;
  adherenceSummary: { total: number; taken: number; skipped: number; missed: number; percent: number | null };
  flags: string[];
  recentAudit: Array<{
    id: string;
    action: string;
    summary?: string | null;
    createdAt: string;
    actorName?: string | null;
  }>;
  safeActions: string[];
};

@Component({
  selector: 'app-consumers-page',
  imports: [CommonModule, FormField, PatientIdCardComponent],
  templateUrl: './consumers-page.html',
  styleUrl: './consumers-page.scss'
})
export class ConsumersPage {
  consumers: Consumer[] = [];
  selectedConsumerId = '';
  consumerDetail: ConsumerDetail | null = null;
  listLoading = false;
  detailLoading = false;
  readonly listFilterModel = signal({
    searchTerm: '',
    sortBy: CONSUMERS_LIST_DEFAULTS.SORT_BY as ConsumerSortField,
    sortDirection: CONSUMERS_LIST_DEFAULTS.SORT_DIRECTION as SortDirection
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
    consultationId: ''
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
  patientSearchResults: Array<any> = [];
  stores: Array<{ id: string; name: string; code: string }> = [];

  readonly supportCategories = SUPPORT_NOTE_CATEGORIES;
  readonly categoryStyles = SUPPORT_NOTE_CATEGORY_STYLES;

  constructor(
    private readonly api: AdminApi,
    private readonly route: ActivatedRoute
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
      this.stores = (response.stores || []).map((store: any) => ({
        id: store.id,
        name: store.name,
        code: store.code
      }));
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
          this.loadSupport(this.selectedConsumerId)
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
        sortDirection: filters.sortDirection
      });
      this.consumers = response.consumers || [];
      this.totalPagesCount = Math.max(1, Number(response.pagination?.totalPages || 1));
      if (!this.selectedConsumerId) {
        this.selectedConsumerId = this.consumers[0]?.id || '';
      } else if (!this.consumers.some((c) => c.id === this.selectedConsumerId)) {
        // Deep-linked consumer may not be on current page of results — still load detail.
      }
      if (this.selectedConsumerId) {
        await Promise.all([
          this.loadConsumerDetail(this.selectedConsumerId),
          this.loadSupport(this.selectedConsumerId)
        ]);
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

  totalPages() {
    return this.totalPagesCount;
  }

  pages() {
    return Array.from({ length: this.totalPages() }, (_, index) => index + 1);
  }

  async selectConsumer(consumerId: string) {
    this.selectedConsumerId = consumerId;
    this.detailTab = 'overview';
    await Promise.all([this.loadConsumerDetail(consumerId), this.loadSupport(consumerId)]);
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
        consultationId: note.consultationId || undefined
      });
      this.noteModel.set({ category: 'GENERAL', body: '', consultationId: '' });
      await this.loadSupport(this.selectedConsumerId);
    } catch {
      this.noteError = 'Could not save support note.';
    } finally {
      this.savingNote = false;
    }
  }

  categoryStyle(category: SupportNoteCategory) {
    return this.categoryStyles[category] ?? this.categoryStyles.GENERAL;
  }

  private async loadConsumerDetail(consumerId: string) {
    this.detailLoading = true;
    this.detailError = '';
    try {
      this.consumerDetail = (await this.api.getConsumerDetail(consumerId)) as ConsumerDetail;
    } catch {
      this.detailError = 'Could not load consumer details.';
      this.consumerDetail = null;
    } finally {
      this.detailLoading = false;
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
      scanUrl: `${environment.apiUrl}/go/p/${encodeURIComponent(consumer.patientCode)}`
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
        homeClinicStoreId: form.homeClinicStoreId || null
      });
      this.registerMessage = `Patient registered: ${response.patient.patientCode || response.patient.id}`;
      this.registerModel.set({ name: '', email: '', mobile: '', homeClinicStoreId: '' });
      this.showRegister = false;
      await this.load();
      if (response.patient.id) {
        await this.selectConsumer(response.patient.id);
      }
    } catch (e: any) {
      this.registerError = e?.error?.message || 'Could not register patient.';
    } finally {
      this.registerSaving = false;
    }
  }

}
