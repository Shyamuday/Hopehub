import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { buildDetailRows, DetailRowsComponent } from '@hopehub/platform-ui';
import { AdminApi } from '../../../core/services/admin-api';
import { adminRouteLink, ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import {
  DOCTORS_LIST_DEFAULTS,
  DOCTORS_PAGE_SIZE,
  type DoctorSortField,
  type DoctorStatusFilter,
} from '../constants/doctors-list.constants';
import { DOCTOR_DETAIL_FIELDS } from '../constants/doctor-detail.fields';
import {
  DOCTOR_TYPE_OPTIONS,
  PROVIDER_TYPE_OPTIONS,
  SPECIALTY_FOCUS_OPTIONS,
  DOCTOR_TYPE_LABELS,
  PROVIDER_TYPE_LABELS,
  SPECIALTY_FOCUS_LABELS,
  type HomeopathicDoctorType,
  type HomeopathicSpecialtyFocus,
  type ProviderType,
} from '../constants/doctor-types.constants';
import type { SortDirection } from '../../../shared/constants/filter.constants';

type Doctor = {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  isActive: boolean;
  createdAt?: string;
  doctorProfile?: {
    providerType?: ProviderType;
    providerTypeLabel?: string;
    specialty?: string;
    specialization?: string | null;
    registrationNo?: string;
    isAvailable?: boolean;
    doctorType?: HomeopathicDoctorType;
    specialtyFocus?: HomeopathicSpecialtyFocus | null;
    bio?: string | null;
    showOnWebsite?: boolean;
    websiteOrder?: number | null;
    yearsOfExperience?: number | null;
    focusAreas?: string[];
  };
};

type SiteConfigEntry = { key: string; value: string; label: string; description: string };

function emptyCreateModel() {
  return {
    name: '',
    email: '',
    mobile: '',
    password: '',
    specialty: '',
    registrationNo: '',
    providerType: 'HOMEOPATH' as ProviderType,
    specialization: '',
    doctorType: 'JUNIOR_DOCTOR' as HomeopathicDoctorType,
    specialtyFocus: '' as HomeopathicSpecialtyFocus | '',
  };
}

function emptyEditModel() {
  return {
    name: '',
    email: '',
    mobile: '',
    specialty: '',
    registrationNo: '',
    isAvailable: true,
    providerType: 'HOMEOPATH' as ProviderType,
    specialization: '',
    doctorType: 'JUNIOR_DOCTOR' as HomeopathicDoctorType,
    specialtyFocus: '' as HomeopathicSpecialtyFocus | '',
    bio: '',
    showOnWebsite: false,
    websiteOrder: '' as number | '',
    yearsOfExperience: '' as number | '',
    focusAreasText: '',
  };
}

@Component({
  selector: 'app-doctors-page',
  imports: [CommonModule, FormField, DetailRowsComponent, RouterLink],
  templateUrl: './doctors-page.html',
  styleUrl: './doctors-page.scss',
})
export class DoctorsPage {
  readonly doctorTypeOptions = DOCTOR_TYPE_OPTIONS;
  readonly providerTypeOptions = PROVIDER_TYPE_OPTIONS;
  readonly specialtyFocusOptions = SPECIALTY_FOCUS_OPTIONS;
  readonly clinicalRecordsRoute = adminRouteLink(ROUTE_PATHS.CLINICAL_RECORDS);

  readonly doctors = signal<Doctor[]>([]);
  readonly pendingDoctors = signal<Doctor[]>([]);
  selectedPendingDoctorIds: string[] = [];
  selectedDoctorId = '';

  readonly listFilterModel = signal({
    searchTerm: '',
    sortBy: DOCTORS_LIST_DEFAULTS.SORT_BY as DoctorSortField,
    sortDirection: DOCTORS_LIST_DEFAULTS.SORT_DIRECTION as SortDirection,
    statusFilter: DOCTORS_LIST_DEFAULTS.STATUS_FILTER as DoctorStatusFilter,
  });
  readonly listFilterForm = form(this.listFilterModel);

  readonly pendingFilterModel = signal({ searchTerm: '' });
  readonly pendingFilterForm = form(this.pendingFilterModel);

  readonly createModel = signal(emptyCreateModel());
  readonly createForm = form(this.createModel);
  readonly editModel = signal(emptyEditModel());
  readonly editForm = form(this.editModel);

  pageSize = DOCTORS_PAGE_SIZE;
  doctorsPage = 1;
  pendingPage = 1;
  doctorsTotalPagesCount = 1;
  pendingTotalPagesCount = 1;

  readonly loading = signal(false);
  readonly mutating = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  readonly siteConfig = signal<SiteConfigEntry[]>([]);
  readonly savingConfig = signal(false);
  readonly configMessage = signal('');
  readonly doctorListLimitValue = signal('12');

  constructor(private readonly api: AdminApi) {
    void this.load();
    void this.loadSiteConfig();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    const filters = this.listFilterModel();
    const pendingFilters = this.pendingFilterModel();
    try {
      const [allDoctors, pending] = await Promise.all([
        this.api.getDoctorsPaged({
          page: this.doctorsPage,
          pageSize: this.pageSize,
          q: filters.searchTerm,
          status: filters.statusFilter,
          sortBy: filters.sortBy,
          sortDirection: filters.sortDirection,
        }),
        this.api.getPendingDoctorsPaged({
          page: this.pendingPage,
          pageSize: this.pageSize,
          q: pendingFilters.searchTerm,
        }),
      ]);
      this.doctors.set(allDoctors.doctors || []);
      this.pendingDoctors.set(pending.pendingDoctors || []);
      this.doctorsTotalPagesCount = Math.max(1, Number(allDoctors.pagination?.totalPages || 1));
      this.pendingTotalPagesCount = Math.max(1, Number(pending.pagination?.totalPages || 1));
      this.selectedPendingDoctorIds = [];
      this.selectedDoctorId = this.selectedDoctorId || this.visibleDoctors()[0]?.id || '';
      this.syncEditFormFromSelectedDoctor();
    } catch {
      this.error.set('Could not load doctors.');
    } finally {
      this.loading.set(false);
    }
  }

  onListFilterChange() {
    void this.setDoctorsPage(1);
  }

  onPendingFilterChange() {
    void this.setPendingPage(1);
  }

  async approveDoctor(doctorId: string) {
    this.message.set('');
    this.error.set('');
    this.mutating.set(true);
    try {
      await this.api.approveDoctor(doctorId);
      this.message.set('Doctor approved.');
      await this.load();
    } catch {
      this.error.set('Could not approve doctor.');
    } finally {
      this.mutating.set(false);
    }
  }

  async rejectDoctor(doctorId: string) {
    this.message.set('');
    this.error.set('');
    this.mutating.set(true);
    try {
      await this.api.rejectDoctor(doctorId);
      this.message.set('Doctor kept as pending/inactive.');
      await this.load();
    } catch {
      this.error.set('Could not update doctor status.');
    } finally {
      this.mutating.set(false);
    }
  }

  async toggleDoctorStatus(doctorId: string, makeActive: boolean) {
    this.message.set('');
    this.error.set('');
    this.mutating.set(true);
    try {
      await this.api.setDoctorStatus(doctorId, makeActive);
      this.message.set(makeActive ? 'Doctor activated.' : 'Doctor deactivated.');
      await this.load();
      this.selectedDoctorId = doctorId;
      this.syncEditFormFromSelectedDoctor();
    } catch {
      this.error.set('Could not update doctor status.');
    } finally {
      this.mutating.set(false);
    }
  }

  async saveDoctorEdits() {
    this.message.set('');
    this.error.set('');
    const doctorId = this.selectedDoctorId;
    if (!doctorId) {
      return;
    }

    const edit = this.editModel();
    this.mutating.set(true);
    try {
      await this.api.updateDoctor(doctorId, {
        name: edit.name.trim(),
        email: edit.email.trim(),
        mobile: edit.mobile.trim(),
        specialty: edit.specialty.trim(),
        registrationNo: edit.registrationNo.trim(),
        isAvailable: edit.isAvailable,
        providerType: edit.providerType,
        specialization: edit.specialization.trim(),
        doctorType: edit.doctorType,
        specialtyFocus:
          edit.doctorType === 'SPECIALIST_CONSULTANT' ? edit.specialtyFocus || null : null,
        bio: edit.bio.trim() || null,
        showOnWebsite: edit.showOnWebsite,
        websiteOrder: edit.websiteOrder !== '' ? Number(edit.websiteOrder) : null,
        yearsOfExperience: edit.yearsOfExperience !== '' ? Number(edit.yearsOfExperience) : null,
        focusAreas: edit.focusAreasText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      this.message.set('Doctor profile updated.');
      await this.load();
      this.selectedDoctorId = doctorId;
      this.syncEditFormFromSelectedDoctor();
    } catch {
      this.error.set('Could not update doctor profile.');
    } finally {
      this.mutating.set(false);
    }
  }

  async createDoctor() {
    this.message.set('');
    this.error.set('');
    const create = this.createModel();
    this.mutating.set(true);
    try {
      await this.api.createDoctor({
        name: create.name.trim(),
        email: create.email.trim(),
        mobile: create.mobile.trim(),
        password: create.password,
        specialty: create.specialty.trim(),
        registrationNo: create.registrationNo.trim(),
        providerType: create.providerType,
        specialization: create.specialization.trim(),
        doctorType: create.doctorType,
        specialtyFocus:
          create.doctorType === 'SPECIALIST_CONSULTANT' ? create.specialtyFocus || null : null,
      });
      this.message.set('Doctor created successfully.');
      this.createModel.set(emptyCreateModel());
      await this.load();
    } catch {
      this.error.set('Could not create doctor.');
    } finally {
      this.mutating.set(false);
    }
  }

  togglePendingDoctorSelection(doctorId: string, checked: boolean) {
    if (checked) {
      if (!this.selectedPendingDoctorIds.includes(doctorId)) {
        this.selectedPendingDoctorIds = [...this.selectedPendingDoctorIds, doctorId];
      }
      return;
    }

    this.selectedPendingDoctorIds = this.selectedPendingDoctorIds.filter((id) => id !== doctorId);
  }

  isPendingDoctorSelected(doctorId: string) {
    return this.selectedPendingDoctorIds.includes(doctorId);
  }

  toggleSelectAllVisiblePending(checked: boolean) {
    const visiblePendingIds = this.visiblePendingDoctors().map((doctor) => doctor.id);
    if (checked) {
      this.selectedPendingDoctorIds = Array.from(
        new Set([...this.selectedPendingDoctorIds, ...visiblePendingIds]),
      );
      return;
    }

    this.selectedPendingDoctorIds = this.selectedPendingDoctorIds.filter(
      (id) => !visiblePendingIds.includes(id),
    );
  }

  allVisiblePendingSelected() {
    const visiblePending = this.visiblePendingDoctors();
    if (!visiblePending.length) {
      return false;
    }

    return visiblePending.every((doctor) => this.selectedPendingDoctorIds.includes(doctor.id));
  }

  async bulkApproveSelected() {
    if (!this.selectedPendingDoctorIds.length) {
      return;
    }

    this.message.set('');
    this.error.set('');
    this.mutating.set(true);
    try {
      await Promise.all(this.selectedPendingDoctorIds.map((id) => this.api.approveDoctor(id)));
      this.message.set(`${this.selectedPendingDoctorIds.length} doctors approved.`);
      await this.load();
    } catch {
      this.error.set('Could not complete bulk approve.');
    } finally {
      this.mutating.set(false);
    }
  }

  async bulkRejectSelected() {
    if (!this.selectedPendingDoctorIds.length) {
      return;
    }

    this.message.set('');
    this.error.set('');
    this.mutating.set(true);
    try {
      await Promise.all(this.selectedPendingDoctorIds.map((id) => this.api.rejectDoctor(id)));
      this.message.set(`${this.selectedPendingDoctorIds.length} doctors kept pending.`);
      await this.load();
    } catch {
      this.error.set('Could not complete bulk reject.');
    } finally {
      this.mutating.set(false);
    }
  }

  async setDoctorsPage(page: number) {
    this.doctorsPage = page;
    await this.load();
  }

  async setPendingPage(page: number) {
    this.pendingPage = page;
    await this.load();
  }

  visibleDoctors() {
    return this.doctors();
  }

  visiblePendingDoctors() {
    return this.pendingDoctors();
  }

  doctorsTotalPages() {
    return this.doctorsTotalPagesCount;
  }

  pendingTotalPages() {
    return this.pendingTotalPagesCount;
  }

  doctorsPages() {
    return Array.from({ length: this.doctorsTotalPages() }, (_, index) => index + 1);
  }

  pendingPages() {
    return Array.from({ length: this.pendingTotalPages() }, (_, index) => index + 1);
  }

  selectedDoctorDetails() {
    return this.doctors().find((doctor) => doctor.id === this.selectedDoctorId) || null;
  }

  selectedDoctorDetailRows() {
    const doctor = this.selectedDoctorDetails();
    return doctor ? buildDetailRows(doctor, DOCTOR_DETAIL_FIELDS) : [];
  }

  setSelectedDoctor(doctorId: string) {
    this.selectedDoctorId = doctorId;
    this.syncEditFormFromSelectedDoctor();
  }

  private syncEditFormFromSelectedDoctor() {
    const selected = this.selectedDoctorDetails();
    if (!selected) {
      return;
    }

    this.editModel.set({
      name: selected.name || '',
      email: selected.email || '',
      mobile: selected.mobile || '',
      specialty: selected.doctorProfile?.specialty || '',
      registrationNo: selected.doctorProfile?.registrationNo || '',
      isAvailable: selected.doctorProfile?.isAvailable ?? true,
      providerType: selected.doctorProfile?.providerType || 'HOMEOPATH',
      specialization: selected.doctorProfile?.specialization || '',
      doctorType: selected.doctorProfile?.doctorType || 'JUNIOR_DOCTOR',
      specialtyFocus: selected.doctorProfile?.specialtyFocus || '',
      bio: selected.doctorProfile?.bio || '',
      showOnWebsite: selected.doctorProfile?.showOnWebsite ?? false,
      websiteOrder: selected.doctorProfile?.websiteOrder ?? '',
      yearsOfExperience: selected.doctorProfile?.yearsOfExperience ?? '',
      focusAreasText: (selected.doctorProfile?.focusAreas ?? []).join('\n'),
    });
  }

  async loadSiteConfig() {
    try {
      const res = await this.api.getSiteConfig();
      this.siteConfig.set(res.config);
      const limitEntry = res.config.find((c) => c.key === 'doctorListLimit');
      if (limitEntry) this.doctorListLimitValue.set(limitEntry.value);
    } catch {
      /* silently ignore */
    }
  }

  async saveDoctorListLimit() {
    this.configMessage.set('');
    this.savingConfig.set(true);
    try {
      await this.api.setSiteConfig('doctorListLimit', this.doctorListLimitValue());
      this.configMessage.set('Limit saved.');
      await this.loadSiteConfig();
    } catch {
      this.configMessage.set('Could not save limit.');
    } finally {
      this.savingConfig.set(false);
    }
  }

  async saveDoctorWebsiteOrder(doctorId: string, rawValue: number | '') {
    const websiteOrder = rawValue !== '' ? Number(rawValue) : null;
    this.message.set('');
    this.mutating.set(true);
    try {
      await this.api.setDoctorWebsiteOrder(doctorId, websiteOrder);
      this.message.set('Display order updated.');
      await this.load();
      this.selectedDoctorId = doctorId;
      this.syncEditFormFromSelectedDoctor();
    } catch {
      this.error.set('Could not update display order.');
    } finally {
      this.mutating.set(false);
    }
  }

  isSpecialistType(type: HomeopathicDoctorType) {
    return type === 'SPECIALIST_CONSULTANT';
  }

  isHomeopathProvider(type: ProviderType) {
    return type === 'HOMEOPATH';
  }

  providerTypeLabel(type?: ProviderType) {
    return type ? PROVIDER_TYPE_LABELS[type] : 'Provider';
  }

  doctorTypeLabel(type?: HomeopathicDoctorType) {
    return type ? DOCTOR_TYPE_LABELS[type] : 'Not set';
  }

  specialtyFocusLabel(focus?: HomeopathicSpecialtyFocus | null) {
    return focus ? SPECIALTY_FOCUS_LABELS[focus] : '';
  }

  clinicalRecordsQuery(tab: 'prescriptions' | 'analyses' = 'prescriptions') {
    return { tab, doctorId: this.selectedDoctorId };
  }
}
