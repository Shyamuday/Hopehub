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
    return firstValueFrom(
      this.http.get<{ consultations: Array<any> }>(`${this.apiBase}${API_PATHS.CONSULTATIONS}`),
    );
  }

  getConsumersPaged(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    sortBy?: ConsumerSortField;
    sortDirection?: SortDirection;
  }) {
    return firstValueFrom(
      this.http.get<{ consumers: Array<any>; pagination: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.CONSUMERS}`,
        {
          params: {
            page: String(params.page ?? 1),
            pageSize: String(params.pageSize ?? PAGE_SIZES.CONSUMERS),
            q: params.q ?? '',
            sortBy: params.sortBy ?? 'consultations',
            sortDirection: params.sortDirection ?? SORT_DIRECTIONS.DESC,
          },
        },
      ),
    );
  }

  getConsumerDetail(consumerId: string) {
    return firstValueFrom(
      this.http.get<{ consumer: any; consultations: Array<any>; adherence: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.CONSUMERS}/${consumerId}`,
      ),
    );
  }

  getConsumerSupport(consumerId: string) {
    return firstValueFrom(
      this.http.get<{ notes: Array<any>; context: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.CONSUMER_SUPPORT(consumerId)}`,
      ),
    );
  }

  addConsumerSupportNote(
    consumerId: string,
    payload: { category: string; body: string; consultationId?: string },
  ) {
    return firstValueFrom(
      this.http.post<{ note: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.CONSUMER_SUPPORT_NOTES(consumerId)}`,
        payload,
      ),
    );
  }

  assignDoctor(consultationId: string, doctorId: string) {
    return firstValueFrom(
      this.http.post(`${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/assign`, {
        doctorId,
      }),
    );
  }

  getActiveDoctors(params?: { workspace?: 'homeopathy' | 'hope-hub' }) {
    return firstValueFrom(
      this.http.get<{
        doctors: Array<{ id: string; name: string; doctorProfile?: { specialty?: string } | null }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}`, {
        params: {
          status: 'ACTIVE',
          pageSize: String(PAGE_SIZES.ACTIVE_DOCTORS),
          page: '1',
          q: '',
          sortBy: 'name',
          sortDirection: SORT_DIRECTIONS.ASC,
          workspace: params?.workspace ?? '',
        },
      }),
    );
  }

  getDiseaseCategories() {
    return firstValueFrom(
      this.http.get<{ categories: Array<{ key: string; label: string }> }>(
        `${this.apiBase}${API_PATHS.ADMIN.DISEASE_CATEGORIES}`,
      ),
    );
  }

  getDiseases(params?: { q?: string; category?: string; grouped?: boolean }) {
    const query: Record<string, string> = {};
    if (params?.q?.trim()) query['q'] = params.q.trim();
    if (params?.category?.trim()) query['category'] = params.category.trim();
    if (params?.grouped === false) query['grouped'] = 'false';

    return firstValueFrom(
      this.http.get<{
        diseases: Array<{
          id: string;
          name: string;
          description: string;
          feeInPaise: number;
          isActive: boolean;
          intakeQuestions: string[];
          publicCategory: string | null;
        }>;
        categories?: Array<{
          key: string;
          label: string;
          diseases: Array<{
            id: string;
            name: string;
            description: string;
            feeInPaise: number;
            isActive: boolean;
            publicCategory: string | null;
          }>;
        }>;
        uncategorized?: Array<{
          id: string;
          name: string;
          description: string;
          feeInPaise: number;
          isActive: boolean;
          publicCategory: string | null;
        }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.DISEASES_LIST}`, { params: query }),
    );
  }

  syncDiseaseCatalog(defaultFeeInPaise?: number) {
    return firstValueFrom(
      this.http.post<{ created: number; categorized: number; total: number }>(
        `${this.apiBase}${API_PATHS.ADMIN.DISEASES_SYNC_CATALOG}`,
        defaultFeeInPaise ? { defaultFeeInPaise } : {},
      ),
    );
  }

  reconcileDiseaseOptions() {
    return firstValueFrom(
      this.http.post<{ synced: number }>(
        `${this.apiBase}${API_PATHS.ADMIN.DISEASES_RECONCILE_OPTIONS}`,
        {},
      ),
    );
  }

  getDiseasePublicPage(id: string) {
    return firstValueFrom(
      this.http.get<{
        id: string;
        name: string;
        slug: string | null;
        publicDescription: string | null;
        publicImageUrl: string | null;
        seoTitle: string | null;
        seoDescription: string | null;
        publicFaq: Array<{ question: string; answer: string }>;
        publicPageContent: Record<string, unknown> | null;
      }>(`${this.apiBase}${API_PATHS.ADMIN.DISEASE_PUBLIC_PAGE(id)}`),
    );
  }

  updateDiseasePublicPage(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put(`${this.apiBase}${API_PATHS.ADMIN.DISEASE_PUBLIC_PAGE(id)}`, payload),
    );
  }

  createDisease(payload: {
    name: string;
    description: string;
    publicDescription?: string | null;
    slug?: string | null;
    publicImageUrl?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    publicFaq?: Array<{ question: string; answer: string }> | null;
    feeInPaise: number;
    intakeQuestions: string[];
    publicCategory?: string;
  }) {
    return firstValueFrom(this.http.post(`${this.apiBase}${API_PATHS.ADMIN.DISEASES}`, payload));
  }

  updateDisease(
    id: string,
    payload: {
      name: string;
      description: string;
      publicDescription?: string | null;
      slug?: string | null;
      publicImageUrl?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      publicFaq?: Array<{ question: string; answer: string }> | null;
      feeInPaise: number;
      isActive: boolean;
      intakeQuestions: string[];
      publicCategory?: string | null;
    },
  ) {
    return firstValueFrom(
      this.http.put(`${this.apiBase}${API_PATHS.ADMIN.DISEASES}/${id}`, payload),
    );
  }

  getLocationFees(diseaseId?: string) {
    return firstValueFrom(
      this.http.get<{ fees: Array<any>; onlineKey: string }>(
        `${this.apiBase}${API_PATHS.ADMIN.LOCATION_FEES}`,
        {
          params: diseaseId ? { diseaseId } : {},
        },
      ),
    );
  }

  saveLocationFee(payload: { diseaseId: string; locationKey: string; feeInPaise: number }) {
    return firstValueFrom(
      this.http.put(`${this.apiBase}${API_PATHS.ADMIN.LOCATION_FEES}`, payload),
    );
  }

  deleteLocationFee(diseaseId: string, locationKey: string) {
    return firstValueFrom(
      this.http.delete(
        `${this.apiBase}${API_PATHS.ADMIN.LOCATION_FEES}/${diseaseId}/${locationKey}`,
      ),
    );
  }

  getBillingPlansAdmin() {
    return firstValueFrom(
      this.http.get<{ plans: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.BILLING_PLANS}`),
    );
  }

  updateBillingPlan(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put(`${this.apiBase}${API_PATHS.ADMIN.BILLING_PLANS}/${id}`, payload),
    );
  }

  getHopeHubOfferingsAdmin() {
    return firstValueFrom(
      this.http.get<{ offerings: Array<any> }>(
        `${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_OFFERINGS}`,
      ),
    );
  }

  uploadHopeHubMedia(file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('fileName', file.name);
    return firstValueFrom(
      this.http.post<{
        storageKey: string;
        fileUrl: string;
        byteSize: number;
        sha256: string;
        mimeType: string;
      }>(`${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_MEDIA}`, formData),
    );
  }

  createHopeHubOffering(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ offering: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_OFFERINGS}`,
        payload,
      ),
    );
  }

  updateHopeHubOffering(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put<{ offering: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_OFFERING_BY_ID(id)}`,
        payload,
      ),
    );
  }

  getHopeHubBannersAdmin() {
    return firstValueFrom(
      this.http.get<{ banners: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_BANNERS}`),
    );
  }

  createHopeHubBanner(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ banner: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_BANNERS}`,
        payload,
      ),
    );
  }

  updateHopeHubBanner(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put<{ banner: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_BANNER_BY_ID(id)}`,
        payload,
      ),
    );
  }

  getHopeHubOrganizationLeadsAdmin() {
    return firstValueFrom(
      this.http.get<{ leads: Array<any> }>(
        `${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_ORGANIZATION_LEADS}`,
      ),
    );
  }

  updateHopeHubOrganizationLead(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put<{ lead: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_ORGANIZATION_LEAD_BY_ID(id)}`,
        payload,
      ),
    );
  }

  getAssessmentDefinitionsAdmin(params: { includeInactive?: boolean; q?: string } = {}) {
    return firstValueFrom(
      this.http.get<{ definitions: Array<any>; pagination: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.ASSESSMENT_DEFINITIONS}`,
        {
          params: {
            includeInactive: String(params.includeInactive ?? true),
            q: params.q ?? '',
            pageSize: '100',
          },
        },
      ),
    );
  }

  getHopeHubConsumerFlows() {
    return firstValueFrom(
      this.http.get<{
        flows: Array<any>;
        issues: Array<any>;
        meta: { source: string; total: number; healthy: boolean };
      }>(`${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_CONSUMER_FLOWS}`),
    );
  }

  getAssessmentAccessReport(
    params: {
      q?: string;
      status?: string;
      assessmentId?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    return firstValueFrom(
      this.http.get<{
        payments: Array<any>;
        redemptions: Array<any>;
        couponUsage: Array<any>;
        summary: any;
        pagination: any;
      }>(`${this.apiBase}${API_PATHS.ADMIN.ASSESSMENT_ACCESS_REPORT}`, {
        params: {
          q: params.q ?? '',
          status: params.status ?? '',
          assessmentId: params.assessmentId ?? '',
          page: String(params.page ?? 1),
          pageSize: String(params.pageSize ?? 20),
        },
      }),
    );
  }

  createAssessmentDefinition(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ definition: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.ASSESSMENT_DEFINITIONS}`,
        payload,
      ),
    );
  }

  updateAssessmentDefinition(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.patch<{ definition: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.ASSESSMENT_DEFINITION_BY_ID(id)}`,
        payload,
      ),
    );
  }

  publishAssessmentDefinition(id: string) {
    return firstValueFrom(
      this.http.post<{ definition: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.ASSESSMENT_DEFINITION_PUBLISH(id)}`,
        {},
      ),
    );
  }

  unpublishAssessmentDefinition(id: string) {
    return firstValueFrom(
      this.http.post<{ definition: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.ASSESSMENT_DEFINITION_UNPUBLISH(id)}`,
        {},
      ),
    );
  }

  getPracticesAdmin(
    params: { q?: string; status?: string; page?: number; pageSize?: number } = {},
  ) {
    return firstValueFrom(
      this.http.get<{ practices: Array<any>; pagination: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.PRACTICES}`,
        {
          params: {
            q: params.q ?? '',
            status: params.status ?? '',
            page: String(params.page ?? 1),
            pageSize: String(params.pageSize ?? 100),
          },
        },
      ),
    );
  }

  createPractice(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ practice: any }>(`${this.apiBase}${API_PATHS.ADMIN.PRACTICES}`, payload),
    );
  }

  updatePractice(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put<{ practice: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.PRACTICE_BY_ID(id)}`,
        payload,
      ),
    );
  }

  archivePractice(id: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(`${this.apiBase}${API_PATHS.ADMIN.PRACTICE_BY_ID(id)}`),
    );
  }

  createPracticeRule(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ rule: any }>(`${this.apiBase}${API_PATHS.ADMIN.PRACTICE_RULES}`, payload),
    );
  }

  updatePracticeRule(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put<{ rule: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.PRACTICE_RULE_BY_ID(id)}`,
        payload,
      ),
    );
  }

  deletePracticeRule(id: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(
        `${this.apiBase}${API_PATHS.ADMIN.PRACTICE_RULE_BY_ID(id)}`,
      ),
    );
  }

  getLifestyleTipsAdmin(
    params: { q?: string; status?: string; page?: number; pageSize?: number } = {},
  ) {
    return firstValueFrom(
      this.http.get<{ tips: Array<any>; pagination: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.LIFESTYLE_TIPS}`,
        {
          params: {
            q: params.q ?? '',
            status: params.status ?? '',
            page: String(params.page ?? 1),
            pageSize: String(params.pageSize ?? 100),
          },
        },
      ),
    );
  }

  createLifestyleTip(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ tip: any }>(`${this.apiBase}${API_PATHS.ADMIN.LIFESTYLE_TIPS}`, payload),
    );
  }

  updateLifestyleTip(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put<{ tip: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.LIFESTYLE_TIP_BY_ID(id)}`,
        payload,
      ),
    );
  }

  archiveLifestyleTip(id: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(
        `${this.apiBase}${API_PATHS.ADMIN.LIFESTYLE_TIP_BY_ID(id)}`,
      ),
    );
  }

  createLifestyleTipRule(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ rule: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.LIFESTYLE_TIP_RULES}`,
        payload,
      ),
    );
  }

  updateLifestyleTipRule(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put<{ rule: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.LIFESTYLE_TIP_RULE_BY_ID(id)}`,
        payload,
      ),
    );
  }

  deleteLifestyleTipRule(id: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(
        `${this.apiBase}${API_PATHS.ADMIN.LIFESTYLE_TIP_RULE_BY_ID(id)}`,
      ),
    );
  }
}
