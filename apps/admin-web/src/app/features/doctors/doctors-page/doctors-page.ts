import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';

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
  };
};

@Component({
  selector: 'app-doctors-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './doctors-page.html',
  styleUrl: './doctors-page.scss'
})
export class DoctorsPage {
  doctors: Doctor[] = [];
  pendingDoctors: Doctor[] = [];
  selectedPendingDoctorIds: string[] = [];
  selectedDoctorId = '';

  searchTerm = '';
  pendingSearchTerm = '';
  sortBy: 'name' | 'createdAt' | 'status' = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';

  pageSize = 6;
  doctorsPage = 1;
  pendingPage = 1;
  doctorsTotalPagesCount = 1;
  pendingTotalPagesCount = 1;

  loading = false;
  mutating = false;
  error = '';
  message = '';
  editName = '';
  editEmail = '';
  editMobile = '';
  editSpecialty = '';
  editRegistrationNo = '';
  editIsAvailable = true;
  createName = '';
  createEmail = '';
  createMobile = '';
  createPassword = '';
  createSpecialty = '';
  createRegistrationNo = '';

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const [allDoctors, pending] = await Promise.all([
        this.api.getDoctorsPaged({
          page: this.doctorsPage,
          pageSize: this.pageSize,
          q: this.searchTerm,
          status: this.statusFilter,
          sortBy: this.sortBy,
          sortDirection: this.sortDirection
        }),
        this.api.getPendingDoctorsPaged({
          page: this.pendingPage,
          pageSize: this.pageSize,
          q: this.pendingSearchTerm
        })
      ]);
      this.doctors = allDoctors.doctors || [];
      this.pendingDoctors = pending.pendingDoctors || [];
      this.doctorsTotalPagesCount = Math.max(1, Number(allDoctors.pagination?.totalPages || 1));
      this.pendingTotalPagesCount = Math.max(1, Number(pending.pagination?.totalPages || 1));
      this.selectedPendingDoctorIds = [];
      this.selectedDoctorId = this.selectedDoctorId || this.visibleDoctors()[0]?.id || '';
      this.syncEditFormFromSelectedDoctor();
    } catch {
      this.error = 'Could not load doctors.';
    } finally {
      this.loading = false;
    }
  }

  async approveDoctor(doctorId: string) {
    this.message = '';
    this.error = '';
    this.mutating = true;
    try {
      await this.api.approveDoctor(doctorId);
      this.message = 'Doctor approved.';
      await this.load();
    } catch {
      this.error = 'Could not approve doctor.';
    } finally {
      this.mutating = false;
    }
  }

  async rejectDoctor(doctorId: string) {
    this.message = '';
    this.error = '';
    this.mutating = true;
    try {
      await this.api.rejectDoctor(doctorId);
      this.message = 'Doctor kept as pending/inactive.';
      await this.load();
    } catch {
      this.error = 'Could not update doctor status.';
    } finally {
      this.mutating = false;
    }
  }

  async toggleDoctorStatus(doctorId: string, makeActive: boolean) {
    this.message = '';
    this.error = '';
    this.mutating = true;
    try {
      await this.api.setDoctorStatus(doctorId, makeActive);
      this.message = makeActive ? 'Doctor activated.' : 'Doctor deactivated.';
      await this.load();
      this.selectedDoctorId = doctorId;
      this.syncEditFormFromSelectedDoctor();
    } catch {
      this.error = 'Could not update doctor status.';
    } finally {
      this.mutating = false;
    }
  }

  async saveDoctorEdits() {
    this.message = '';
    this.error = '';
    const doctorId = this.selectedDoctorId;
    if (!doctorId) {
      return;
    }

    this.mutating = true;
    try {
      await this.api.updateDoctor(doctorId, {
        name: this.editName.trim(),
        email: this.editEmail.trim(),
        mobile: this.editMobile.trim(),
        specialty: this.editSpecialty.trim(),
        registrationNo: this.editRegistrationNo.trim(),
        isAvailable: this.editIsAvailable
      });
      this.message = 'Doctor profile updated.';
      await this.load();
      this.selectedDoctorId = doctorId;
      this.syncEditFormFromSelectedDoctor();
    } catch {
      this.error = 'Could not update doctor profile.';
    } finally {
      this.mutating = false;
    }
  }

  async createDoctor() {
    this.message = '';
    this.error = '';
    this.mutating = true;
    try {
      await this.api.createDoctor({
        name: this.createName.trim(),
        email: this.createEmail.trim(),
        mobile: this.createMobile.trim(),
        password: this.createPassword,
        specialty: this.createSpecialty.trim(),
        registrationNo: this.createRegistrationNo.trim()
      });
      this.message = 'Doctor created successfully.';
      this.createName = '';
      this.createEmail = '';
      this.createMobile = '';
      this.createPassword = '';
      this.createSpecialty = '';
      this.createRegistrationNo = '';
      await this.load();
    } catch {
      this.error = 'Could not create doctor.';
    } finally {
      this.mutating = false;
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
      this.selectedPendingDoctorIds = Array.from(new Set([...this.selectedPendingDoctorIds, ...visiblePendingIds]));
      return;
    }

    this.selectedPendingDoctorIds = this.selectedPendingDoctorIds.filter((id) => !visiblePendingIds.includes(id));
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

    this.message = '';
    this.error = '';
    this.mutating = true;
    try {
      await Promise.all(this.selectedPendingDoctorIds.map((id) => this.api.approveDoctor(id)));
      this.message = `${this.selectedPendingDoctorIds.length} doctors approved.`;
      await this.load();
    } catch {
      this.error = 'Could not complete bulk approve.';
    } finally {
      this.mutating = false;
    }
  }

  async bulkRejectSelected() {
    if (!this.selectedPendingDoctorIds.length) {
      return;
    }

    this.message = '';
    this.error = '';
    this.mutating = true;
    try {
      await Promise.all(this.selectedPendingDoctorIds.map((id) => this.api.rejectDoctor(id)));
      this.message = `${this.selectedPendingDoctorIds.length} doctors kept pending.`;
      await this.load();
    } catch {
      this.error = 'Could not complete bulk reject.';
    } finally {
      this.mutating = false;
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
    return this.doctors;
  }

  visiblePendingDoctors() {
    return this.pendingDoctors;
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
    return this.doctors.find((doctor) => doctor.id === this.selectedDoctorId) || null;
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

    this.editName = selected.name || '';
    this.editEmail = selected.email || '';
    this.editMobile = selected.mobile || '';
    this.editSpecialty = selected.doctorProfile?.specialty || '';
    this.editRegistrationNo = selected.doctorProfile?.registrationNo || '';
    this.editIsAvailable = selected.doctorProfile?.isAvailable ?? true;
  }

}
