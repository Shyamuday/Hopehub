import { Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../admin-auth';
import { API_PATHS } from '../../constants/api-paths.constants';
import { FILTER_ALL, SORT_DIRECTIONS } from '../../../shared/constants/filter.constants';
import { PAGE_SIZES } from '../../constants/pagination.constants';
import type { ConsumerSortField } from '../../../features/consumers/constants/consumers-list.constants';
import type { SortDirection } from '../../../shared/constants/filter.constants';

import { AdminApiBase } from './admin-api-base';

@Service()
export class AdminCatalogApi extends AdminApiBase {
  getConsultations() {
    return firstValueFrom(this.http.get<{ consultations: Array<any> }>(`${this.apiBase}${API_PATHS.CONSULTATIONS}`));
  }

  getConsumersPaged(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    sortBy?: ConsumerSortField;
    sortDirection?: SortDirection;
  }) {
    return firstValueFrom(
      this.http.get<{ consumers: Array<any>; pagination: any }>(`${this.apiBase}${API_PATHS.ADMIN.CONSUMERS}`, {
        params: {
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? PAGE_SIZES.CONSUMERS),
          q: params.q ?? '',
          sortBy: params.sortBy ?? 'consultations',
          sortDirection: params.sortDirection ?? SORT_DIRECTIONS.DESC
        }
      })
    );
  }

  getConsumerDetail(consumerId: string) {
    return firstValueFrom(
      this.http.get<{ consumer: any; consultations: Array<any>; adherence: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.CONSUMERS}/${consumerId}`
      )
    );
  }

  getConsumerSupport(consumerId: string) {
    return firstValueFrom(
      this.http.get<{ notes: Array<any>; context: any }>(`${this.apiBase}${API_PATHS.ADMIN.CONSUMER_SUPPORT(consumerId)}`)
    );
  }

  addConsumerSupportNote(
    consumerId: string,
    payload: { category: string; body: string; consultationId?: string }
  ) {
    return firstValueFrom(
      this.http.post<{ note: any }>(`${this.apiBase}${API_PATHS.ADMIN.CONSUMER_SUPPORT_NOTES(consumerId)}`, payload)
    );
  }

  assignDoctor(consultationId: string, doctorId: string) {
    return firstValueFrom(
      this.http.post(`${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/assign`, { doctorId })
    );
  }

  getActiveDoctors() {
    return firstValueFrom(
      this.http.get<{ doctors: Array<{ id: string; name: string; doctorProfile?: { specialty?: string } | null }> }>(
        `${this.apiBase}${API_PATHS.ADMIN.DOCTORS}`,
        {
          params: {
            status: 'ACTIVE',
            pageSize: String(PAGE_SIZES.ACTIVE_DOCTORS),
            page: '1',
            q: '',
            sortBy: 'name',
            sortDirection: SORT_DIRECTIONS.ASC
          }
        }
      )
    );
  }

  getDiseases() {
    return firstValueFrom(
      this.http.get<{ diseases: Array<{ id: string; name: string; description: string; feeInPaise: number; isActive: boolean; intakeQuestions: string[] }> }>(
        `${this.apiBase}${API_PATHS.ADMIN.DISEASES_LIST}`
      )
    );
  }

  createDisease(payload: { name: string; description: string; feeInPaise: number; intakeQuestions: string[] }) {
    return firstValueFrom(this.http.post(`${this.apiBase}${API_PATHS.ADMIN.DISEASES}`, payload));
  }

  updateDisease(id: string, payload: { name: string; description: string; feeInPaise: number; isActive: boolean; intakeQuestions: string[] }) {
    return firstValueFrom(this.http.put(`${this.apiBase}${API_PATHS.ADMIN.DISEASES}/${id}`, payload));
  }
}
