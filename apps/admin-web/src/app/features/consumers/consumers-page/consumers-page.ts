import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ADMIN_PERMISSIONS, adminHasAllPermissions } from '../../../core/admin-permissions';
import { AdminAuth } from '../../../core/services/admin-auth';
import { AdminApi } from '../../../core/services/admin-api';

type Consumer = {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  consultations: number;
};

type ConsumerDetail = {
  consumer: {
    id: string;
    name: string;
    email?: string;
    mobile?: string;
    deliveryAddressLine1?: string | null;
    deliveryAddressLine2?: string | null;
    deliveryCity?: string | null;
    deliveryState?: string | null;
    deliveryPincode?: string | null;
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
};

type ActiveDoctor = {
  id: string;
  name: string;
  doctorProfile?: { specialty?: string } | null;
};

@Component({
  selector: 'app-consumers-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './consumers-page.html',
  styleUrl: './consumers-page.scss'
})
export class ConsumersPage {
  consumers: Consumer[] = [];
  selectedConsumerId = '';
  consumerDetail: ConsumerDetail | null = null;
  listLoading = false;
  detailLoading = false;
  searchTerm = '';
  sortBy: 'name' | 'consultations' = 'consultations';
  sortDirection: 'asc' | 'desc' = 'desc';
  pageSize = 8;
  page = 1;
  totalPagesCount = 1;
  listError = '';
  detailError = '';

  activeDoctors: ActiveDoctor[] = [];
  assigningConsultationId = '';
  assignDoctorId = '';
  assignError = '';
  assigning = false;

  pendingFocusId: string | null = null;

  constructor(
    private readonly api: AdminApi,
    private readonly route: ActivatedRoute,
    readonly auth: AdminAuth
  ) {
    this.pendingFocusId = this.route.snapshot.queryParamMap.get('focus');
    void this.load();
    void this.loadDoctorsIfNeeded();
  }

  canAssign() {
    return adminHasAllPermissions(
      this.auth.user(),
      ADMIN_PERMISSIONS.ASSIGNMENTS_WRITE,
      ADMIN_PERMISSIONS.DOCTORS_READ
    );
  }

  private async loadDoctorsIfNeeded() {
    if (!this.canAssign()) {
      return;
    }
    try {
      const res = await this.api.getActiveDoctors();
      this.activeDoctors = res.doctors || [];
    } catch {
      // non-critical; assignment dropdown will just be empty
    }
  }

  startAssign(consultationId: string) {
    this.assigningConsultationId = consultationId;
    this.assignDoctorId = this.activeDoctors[0]?.id || '';
    this.assignError = '';
  }

  cancelAssign() {
    this.assigningConsultationId = '';
    this.assignDoctorId = '';
    this.assignError = '';
  }

  async confirmAssign() {
    if (!this.assigningConsultationId || !this.assignDoctorId) return;
    this.assigning = true;
    this.assignError = '';
    try {
      await this.api.assignDoctor(this.assigningConsultationId, this.assignDoctorId);
      this.assigningConsultationId = '';
      this.assignDoctorId = '';
      if (this.selectedConsumerId) {
        await this.loadConsumerDetail(this.selectedConsumerId);
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
      const response = await this.api.getConsumersPaged({
        page: this.page,
        pageSize: this.pageSize,
        q: this.searchTerm,
        sortBy: this.sortBy,
        sortDirection: this.sortDirection
      });
      this.consumers = response.consumers || [];
      this.totalPagesCount = Math.max(1, Number(response.pagination?.totalPages || 1));

      const focus = this.pendingFocusId;
      this.pendingFocusId = null;
      const fromFocus = focus && this.consumers.some((c) => c.id === focus) ? focus : '';
      this.selectedConsumerId = fromFocus || this.consumers[0]?.id || '';

      if (this.selectedConsumerId) {
        await this.loadConsumerDetail(this.selectedConsumerId);
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
    await this.loadConsumerDetail(consumerId);
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

}
