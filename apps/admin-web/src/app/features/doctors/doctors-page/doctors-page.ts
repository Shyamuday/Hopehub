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
  SPECIALTY_FOCUS_OPTIONS,
  DOCTOR_TYPE_LABELS,
  SPECIALTY_FOCUS_LABELS,
  type HomeopathicDoctorType,
  type HomeopathicSpecialtyFocus,
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
    specialty?: string;
    registrationNo?: string;
    isAvailable?: boolean;
    doctorType?: HomeopathicDoctorType;
    specialtyFocus?: HomeopathicSpecialtyFocus | null;
    designation?: string | null;
    department?: string | null;
    bio?: string | null;
    showOnWebsite?: boolean;
    websiteOrder?: number | null;
    yearsOfExperience?: number | null;
    focusAreas?: string[];
    mentalHealthProfile?: {
      careTeamType?: CareTeamMemberType;
      qualifications?: string[];
      qualifiedFrom?: string | null;
      licenseNumber?: string | null;
      licenseCouncil?: string | null;
      languages?: string[];
      modalities?: string[];
      sessionTypes?: string[];
      ageGroups?: string[];
      concernsHandled?: string[];
      introSessionTitle?: string | null;
      counsellingApproach?: string | null;
      safetyEscalationNote?: string | null;
      acceptsHighRiskCases?: boolean;
      services?: CareTeamService[];
    } | null;
  };
};

type SiteConfigEntry = { key: string; value: string; label: string; description: string };
type CareTeamMemberType =
  | 'MENTAL_WELLNESS_PROFESSIONAL'
  | 'QUALIFIED_COUNSELLOR'
  | 'PSYCHOLOGY_STUDENT_VOLUNTEER'
  | 'PEER_SUPPORT_VOLUNTEER'
  | 'NLP_COACH'
  | 'LIFE_COACH'
  | 'MEDITATION_BREATHWORK_GUIDE'
  | 'CAREER_STUDY_MENTOR';
type CareTeamService = {
  title: string;
  description?: string | null;
  pricingMode?:
    'FIXED' | 'FREE_INTRO' | 'DISCOUNTED_FIRST' | 'PACKAGE' | 'FREE_VOLUNTEER' | 'PER_MINUTE';
  priceInPaise: number;
  firstSessionPriceInPaise?: number | null;
  followUpPriceInPaise?: number | null;
  introSessionLimit?: number;
  packageSessionCount?: number | null;
  packagePriceInPaise?: number | null;
  freeMinutes?: number;
  pricePerMinuteInPaise?: number | null;
  currency?: string;
  durationMinutes: number;
  isFree?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};
type CareTeamPricingTemplate = CareTeamService & {
  id: string;
  title: string;
  sortOrder?: number;
};

const STALE_PSYCHOLOGIST_PROFILE_TEXT = /homeopathic|doctor|clinical operations/i;
const CARE_SERVICE_PRICING_MODES = new Set([
  'FIXED',
  'FREE_INTRO',
  'DISCOUNTED_FIRST',
  'PACKAGE',
  'FREE_VOLUNTEER',
  'PER_MINUTE',
]);

function psychologistProfileValue(value: string, fallback = 'Psychologist') {
  const trimmed = value.trim();
  return !trimmed || STALE_PSYCHOLOGIST_PROFILE_TEXT.test(trimmed) ? fallback : trimmed;
}

function emptyCreateModel() {
  return {
    name: '',
    email: '',
    mobile: '',
    password: '',
    specialty: '',
    registrationNo: '',
    designation: '',
    department: '',
    doctorType: 'JUNIOR_DOCTOR' as HomeopathicDoctorType,
    specialtyFocus: '' as HomeopathicSpecialtyFocus | '',
    qualificationsText: '',
    qualifiedFrom: '',
    languagesText: '',
    modalitiesText: '',
    sessionTypesText: '',
    ageGroupsText: '',
    concernsHandledText: '',
    careTeamType: 'MENTAL_WELLNESS_PROFESSIONAL' as CareTeamMemberType,
    serviceOffersText: '',
  };
}

function emptyEditModel() {
  return {
    name: '',
    email: '',
    mobile: '',
    specialty: '',
    registrationNo: '',
    designation: '',
    department: '',
    isAvailable: true,
    doctorType: 'JUNIOR_DOCTOR' as HomeopathicDoctorType,
    specialtyFocus: '' as HomeopathicSpecialtyFocus | '',
    bio: '',
    showOnWebsite: false,
    websiteOrder: '' as number | '',
    yearsOfExperience: '' as number | '',
    focusAreasText: '',
    careTeamType: 'MENTAL_WELLNESS_PROFESSIONAL' as CareTeamMemberType,
    qualificationsText: '',
    qualifiedFrom: '',
    licenseNumber: '',
    licenseCouncil: '',
    languagesText: '',
    modalitiesText: '',
    sessionTypesText: '',
    ageGroupsText: '',
    concernsHandledText: '',
    introSessionTitle: '',
    counsellingApproach: '',
    safetyEscalationNote: '',
    acceptsHighRiskCases: false,
    serviceOffersText: '',
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
  readonly careServicePricingModeOptions: Array<{
    value: NonNullable<CareTeamService['pricingMode']>;
    label: string;
  }> = [
    { value: 'FIXED', label: 'Fixed price' },
    { value: 'FREE_INTRO', label: 'First session free' },
    { value: 'DISCOUNTED_FIRST', label: 'Discounted first session' },
    { value: 'PACKAGE', label: 'Package' },
    { value: 'FREE_VOLUNTEER', label: 'Free volunteer support' },
    { value: 'PER_MINUTE', label: 'Per-minute pricing' },
  ];
  readonly careTeamTypeOptions: Array<{ value: CareTeamMemberType; label: string }> = [
    { value: 'MENTAL_WELLNESS_PROFESSIONAL', label: 'Mental wellness professional' },
    { value: 'QUALIFIED_COUNSELLOR', label: 'Qualified counsellor' },
    { value: 'PSYCHOLOGY_STUDENT_VOLUNTEER', label: 'Psychology student volunteer' },
    { value: 'PEER_SUPPORT_VOLUNTEER', label: 'Peer support volunteer' },
    { value: 'NLP_COACH', label: 'NLP coach' },
    { value: 'LIFE_COACH', label: 'Life coach' },
    { value: 'MEDITATION_BREATHWORK_GUIDE', label: 'Meditation / breathwork guide' },
    { value: 'CAREER_STUDY_MENTOR', label: 'Career / study mentor' },
  ];
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
  readonly createCareServices = signal<CareTeamService[]>([]);
  readonly editCareServices = signal<CareTeamService[]>([]);

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
  readonly carePricingTemplates = signal<CareTeamPricingTemplate[]>([]);
  readonly savingConfig = signal(false);
  readonly configMessage = signal('');
  readonly doctorListLimitValue = signal('12');

  constructor(private readonly api: AdminApi) {
    void this.load();
    void this.loadSiteConfig();
    void this.loadCarePricingTemplates();
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
    const editSpecialty = this.isPsychologistType(edit.doctorType)
      ? psychologistProfileValue(edit.specialty)
      : edit.specialty.trim();
    const editDesignation = this.isPsychologistType(edit.doctorType)
      ? psychologistProfileValue(edit.designation)
      : edit.designation.trim();
    const editDepartment = this.isPsychologistType(edit.doctorType)
      ? psychologistProfileValue(edit.department)
      : edit.department.trim();
    this.mutating.set(true);
    try {
      await this.api.updateDoctor(doctorId, {
        name: edit.name.trim(),
        email: edit.email.trim(),
        mobile: edit.mobile.trim(),
        specialty: editSpecialty,
        registrationNo: edit.registrationNo.trim(),
        designation: editDesignation,
        department: editDepartment,
        isAvailable: edit.isAvailable,
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
        mentalHealthProfile: this.isPsychologistType(edit.doctorType)
          ? {
              qualifications: this.lines(edit.qualificationsText),
              careTeamType: edit.careTeamType,
              qualifiedFrom: edit.qualifiedFrom.trim() || null,
              licenseNumber: edit.licenseNumber.trim() || null,
              licenseCouncil: edit.licenseCouncil.trim() || null,
              languages: this.lines(edit.languagesText),
              modalities: this.lines(edit.modalitiesText),
              sessionTypes: this.lines(edit.sessionTypesText),
              ageGroups: this.lines(edit.ageGroupsText),
              concernsHandled: this.lines(edit.concernsHandledText),
              introSessionTitle: edit.introSessionTitle.trim() || null,
              counsellingApproach: edit.counsellingApproach.trim() || null,
              safetyEscalationNote: edit.safetyEscalationNote.trim() || null,
              acceptsHighRiskCases: edit.acceptsHighRiskCases,
              services: this.servicesForSave(this.editCareServices(), edit.serviceOffersText),
            }
          : undefined,
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
    const createSpecialty = this.isPsychologistType(create.doctorType)
      ? psychologistProfileValue(create.specialty)
      : create.specialty.trim();
    const createDesignation = this.isPsychologistType(create.doctorType)
      ? psychologistProfileValue(create.designation)
      : create.designation.trim();
    const createDepartment = this.isPsychologistType(create.doctorType)
      ? psychologistProfileValue(create.department)
      : create.department.trim();
    this.mutating.set(true);
    try {
      await this.api.createDoctor({
        name: create.name.trim(),
        email: create.email.trim(),
        mobile: create.mobile.trim(),
        password: create.password,
        specialty: createSpecialty,
        registrationNo: create.registrationNo.trim(),
        designation: createDesignation,
        department: createDepartment,
        doctorType: create.doctorType,
        specialtyFocus:
          create.doctorType === 'SPECIALIST_CONSULTANT' ? create.specialtyFocus || null : null,
        mentalHealthProfile: this.isPsychologistType(create.doctorType)
          ? {
              qualifications: this.lines(create.qualificationsText),
              careTeamType: create.careTeamType,
              qualifiedFrom: create.qualifiedFrom.trim() || null,
              languages: this.lines(create.languagesText),
              modalities: this.lines(create.modalitiesText),
              sessionTypes: this.lines(create.sessionTypesText),
              ageGroups: this.lines(create.ageGroupsText),
              concernsHandled: this.lines(create.concernsHandledText),
              services: this.servicesForSave(this.createCareServices(), create.serviceOffersText),
            }
          : undefined,
      });
      this.message.set('Doctor created successfully.');
      this.createModel.set(emptyCreateModel());
      this.createCareServices.set([]);
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
    this.message.set('Doctor details loaded.');
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.getElementById('doctor-profile-details')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
  }

  onCreateDoctorTypeChange() {
    const current = this.createModel();
    if (!this.isPsychologistType(current.doctorType)) return;
    this.createModel.set({
      ...current,
      specialty: psychologistProfileValue(current.specialty),
      designation: psychologistProfileValue(current.designation),
      department: psychologistProfileValue(current.department),
      specialtyFocus: '',
    });
  }

  onEditDoctorTypeChange() {
    const current = this.editModel();
    if (!this.isPsychologistType(current.doctorType)) return;
    this.editModel.set({
      ...current,
      specialty: psychologistProfileValue(current.specialty),
      designation: psychologistProfileValue(current.designation),
      department: psychologistProfileValue(current.department),
      specialtyFocus: '',
    });
  }

  async approveSelectedDoctorWithProfile() {
    const doctorId = this.selectedDoctorId;
    if (!doctorId) {
      return;
    }

    await this.saveDoctorEdits();
    if (!this.error()) {
      await this.approveDoctor(doctorId);
      this.selectedDoctorId = doctorId;
      this.syncEditFormFromSelectedDoctor();
    }
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
      designation: selected.doctorProfile?.designation || '',
      department: selected.doctorProfile?.department || '',
      isAvailable: selected.doctorProfile?.isAvailable ?? true,
      doctorType: selected.doctorProfile?.doctorType || 'JUNIOR_DOCTOR',
      specialtyFocus: selected.doctorProfile?.specialtyFocus || '',
      bio: selected.doctorProfile?.bio || '',
      showOnWebsite: selected.doctorProfile?.showOnWebsite ?? false,
      websiteOrder: selected.doctorProfile?.websiteOrder ?? '',
      yearsOfExperience: selected.doctorProfile?.yearsOfExperience ?? '',
      focusAreasText: (selected.doctorProfile?.focusAreas ?? []).join('\n'),
      careTeamType:
        selected.doctorProfile?.mentalHealthProfile?.careTeamType ?? 'MENTAL_WELLNESS_PROFESSIONAL',
      qualificationsText: (selected.doctorProfile?.mentalHealthProfile?.qualifications ?? []).join(
        '\n',
      ),
      qualifiedFrom: selected.doctorProfile?.mentalHealthProfile?.qualifiedFrom || '',
      licenseNumber: selected.doctorProfile?.mentalHealthProfile?.licenseNumber || '',
      licenseCouncil: selected.doctorProfile?.mentalHealthProfile?.licenseCouncil || '',
      languagesText: (selected.doctorProfile?.mentalHealthProfile?.languages ?? []).join('\n'),
      modalitiesText: (selected.doctorProfile?.mentalHealthProfile?.modalities ?? []).join('\n'),
      sessionTypesText: (selected.doctorProfile?.mentalHealthProfile?.sessionTypes ?? []).join(
        '\n',
      ),
      ageGroupsText: (selected.doctorProfile?.mentalHealthProfile?.ageGroups ?? []).join('\n'),
      concernsHandledText: (
        selected.doctorProfile?.mentalHealthProfile?.concernsHandled ?? []
      ).join('\n'),
      introSessionTitle: selected.doctorProfile?.mentalHealthProfile?.introSessionTitle || '',
      counsellingApproach: selected.doctorProfile?.mentalHealthProfile?.counsellingApproach || '',
      safetyEscalationNote: selected.doctorProfile?.mentalHealthProfile?.safetyEscalationNote || '',
      acceptsHighRiskCases:
        selected.doctorProfile?.mentalHealthProfile?.acceptsHighRiskCases ?? false,
      serviceOffersText: this.formatServiceOffers(
        selected.doctorProfile?.mentalHealthProfile?.services ?? [],
      ),
    });
    this.editCareServices.set(
      this.normalizeServiceList(selected.doctorProfile?.mentalHealthProfile?.services ?? []),
    );
  }

  addCareService(target: 'create' | 'edit') {
    const service: CareTeamService = {
      title: '',
      pricingMode: 'FIXED',
      priceInPaise: 50000,
      firstSessionPriceInPaise: null,
      followUpPriceInPaise: null,
      introSessionLimit: 1,
      packageSessionCount: null,
      packagePriceInPaise: null,
      freeMinutes: 5,
      pricePerMinuteInPaise: null,
      currency: 'INR',
      durationMinutes: 30,
      description: '',
      isFree: false,
      isActive: true,
      sortOrder: this.serviceSignal(target)().length,
    };
    this.serviceSignal(target).update((services) => [...services, service]);
  }

  removeCareService(target: 'create' | 'edit', index: number) {
    this.serviceSignal(target).update((services) =>
      services
        .filter((_, i) => i !== index)
        .map((service, sortOrder) => ({ ...service, sortOrder })),
    );
  }

  updateCareService(
    target: 'create' | 'edit',
    index: number,
    key: keyof CareTeamService,
    value: string | boolean,
  ) {
    this.serviceSignal(target).update((services) =>
      services.map((service, i) => {
        if (i !== index) return service;
        const next = { ...service };
        if (
          key === 'priceInPaise' ||
          key === 'firstSessionPriceInPaise' ||
          key === 'followUpPriceInPaise' ||
          key === 'packagePriceInPaise' ||
          key === 'pricePerMinuteInPaise'
        ) {
          (next as any)[key] = value === '' ? null : Math.max(0, Math.round(Number(value) * 100));
        } else if (
          key === 'durationMinutes' ||
          key === 'introSessionLimit' ||
          key === 'packageSessionCount' ||
          key === 'freeMinutes'
        ) {
          (next as any)[key] = value === '' ? null : Math.max(1, Math.round(Number(value)));
        } else {
          (next as any)[key] = value;
        }
        if (key === 'pricingMode') {
          next.isFree = value === 'FREE_VOLUNTEER';
          if (value === 'FREE_VOLUNTEER' || value === 'PER_MINUTE') {
            next.priceInPaise = 0;
          }
        }
        return next;
      }),
    );
  }

  applyPricingTemplate(target: 'create' | 'edit', index: number, templateId: string) {
    const template = this.carePricingTemplates().find((item) => item.id === templateId);
    if (!template) return;
    this.serviceSignal(target).update((services) =>
      services.map((service, i) =>
        i === index
          ? {
              ...service,
              pricingMode: template.pricingMode || 'FIXED',
              priceInPaise: template.priceInPaise ?? 0,
              firstSessionPriceInPaise: template.firstSessionPriceInPaise ?? null,
              followUpPriceInPaise: template.followUpPriceInPaise ?? null,
              introSessionLimit: template.introSessionLimit || 1,
              packageSessionCount: template.packageSessionCount ?? null,
              packagePriceInPaise: template.packagePriceInPaise ?? null,
              freeMinutes: template.freeMinutes || 0,
              pricePerMinuteInPaise: template.pricePerMinuteInPaise ?? null,
              durationMinutes: template.durationMinutes || 30,
              isFree: template.isFree || template.pricingMode === 'FREE_VOLUNTEER',
              description: service.description || template.description || '',
            }
          : service,
      ),
    );
  }

  async loadCarePricingTemplates() {
    try {
      const res = await this.api.listCareTeamPricingTemplates();
      this.carePricingTemplates.set(res.templates as CareTeamPricingTemplate[]);
    } catch {
      this.carePricingTemplates.set([]);
    }
  }

  rupees(value: number | null | undefined) {
    return value == null ? '' : String(value / 100);
  }

  showFirstPrice(service: CareTeamService) {
    return service.pricingMode === 'DISCOUNTED_FIRST';
  }

  showFollowUpPrice(service: CareTeamService) {
    return service.pricingMode === 'FREE_INTRO' || service.pricingMode === 'DISCOUNTED_FIRST';
  }

  showPackageFields(service: CareTeamService) {
    return service.pricingMode === 'PACKAGE';
  }

  showPerMinuteFields(service: CareTeamService) {
    return service.pricingMode === 'PER_MINUTE';
  }

  private serviceSignal(target: 'create' | 'edit') {
    return target === 'create' ? this.createCareServices : this.editCareServices;
  }

  private normalizeServiceList(services: CareTeamService[]) {
    return services.map((service, index) => ({
      ...service,
      pricingMode: service.pricingMode || 'FIXED',
      priceInPaise: service.priceInPaise ?? 0,
      introSessionLimit: service.introSessionLimit || 1,
      freeMinutes: service.freeMinutes || 0,
      pricePerMinuteInPaise: service.pricePerMinuteInPaise ?? null,
      durationMinutes: service.durationMinutes || 30,
      isActive: service.isActive !== false,
      sortOrder: service.sortOrder ?? index,
    }));
  }

  private servicesForSave(services: CareTeamService[], legacyText: string) {
    const structured = services.filter((service) => service.title.trim());
    return structured.length
      ? this.normalizeServiceList(structured)
      : this.parseServiceOffers(legacyText);
  }

  private parseServiceOffers(text: string): CareTeamService[] {
    const rupeesToPaise = (value: string) =>
      value === '' ? null : Math.max(0, Math.round(Number(value || 0) * 100));
    return text
      .split('\n')
      .map((line, index) => {
        const parts = line.split('|').map((part) => part.trim());
        const [title = ''] = parts;
        if (!title) return null;
        const advanced = CARE_SERVICE_PRICING_MODES.has((parts[1] || '').toUpperCase());
        const pricingMode = advanced
          ? (parts[1].toUpperCase() as CareTeamService['pricingMode'])
          : 'FIXED';
        const price = advanced ? parts[2] || '' : parts[1] || '';
        const first = advanced ? parts[3] || '' : '';
        const followUp = advanced ? parts[4] || '' : '';
        const introLimit = advanced ? parts[5] || '' : '';
        const packageSessions = advanced ? parts[6] || '' : '';
        const packagePrice = advanced ? parts[7] || '' : '';
        const freeMinutes = advanced ? parts[8] || '' : '';
        const pricePerMinute = advanced ? parts[9] || '' : '';
        const minutes = advanced ? parts[10] || '' : parts[2] || '';
        const description = advanced ? parts[11] || '' : parts[3] || '';
        const active = advanced ? parts[12] || 'yes' : parts[4] || 'yes';
        const priceInPaise = rupeesToPaise(price) ?? 0;
        const firstSessionPriceInPaise = rupeesToPaise(first);
        const followUpPriceInPaise = rupeesToPaise(followUp);
        const packagePriceInPaise = rupeesToPaise(packagePrice);
        return {
          title,
          description: description || null,
          pricingMode,
          priceInPaise,
          firstSessionPriceInPaise,
          followUpPriceInPaise,
          introSessionLimit: Math.max(1, Number(introLimit || 1)),
          packageSessionCount: packageSessions ? Math.max(1, Number(packageSessions)) : null,
          packagePriceInPaise,
          freeMinutes: Math.max(0, Number(freeMinutes || 0)),
          pricePerMinuteInPaise: rupeesToPaise(pricePerMinute),
          currency: 'INR',
          durationMinutes: Math.max(5, Number(minutes || 30)),
          isFree:
            pricingMode === 'FREE_VOLUNTEER' ||
            (pricingMode !== 'PER_MINUTE' && priceInPaise === 0),
          isActive: !/^no|false|inactive$/i.test(active),
          sortOrder: index,
        };
      })
      .filter(Boolean) as CareTeamService[];
  }

  private formatServiceOffers(services: CareTeamService[]) {
    return services
      .map(
        (service) =>
          `${service.title} | ${service.pricingMode || 'FIXED'} | ${(service.priceInPaise || 0) / 100} | ${service.firstSessionPriceInPaise == null ? '' : service.firstSessionPriceInPaise / 100} | ${service.followUpPriceInPaise == null ? '' : service.followUpPriceInPaise / 100} | ${service.introSessionLimit || 1} | ${service.packageSessionCount || ''} | ${service.packagePriceInPaise == null ? '' : service.packagePriceInPaise / 100} | ${service.freeMinutes || 0} | ${service.pricePerMinuteInPaise == null ? '' : service.pricePerMinuteInPaise / 100} | ${service.durationMinutes || 30} | ${service.description || ''} | ${service.isActive === false ? 'no' : 'yes'}`,
      )
      .join('\n');
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

  isPsychologistType(type: HomeopathicDoctorType) {
    return type === 'PSYCHOLOGIST';
  }

  private lines(value: string) {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
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
