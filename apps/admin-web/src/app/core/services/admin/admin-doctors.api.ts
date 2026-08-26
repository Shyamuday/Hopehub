import { Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../admin-auth';
import { API_PATHS } from '../../constants/api-paths.constants';
import { FILTER_ALL, SORT_DIRECTIONS } from '../../../shared/constants/filter.constants';
import { PAGE_SIZES } from '../../constants/pagination.constants';
import type { DoctorSortField } from '../../../features/doctors/constants/doctors-list.constants';
import type { SortDirection } from '../../../shared/constants/filter.constants';
import type {
  CarePricingTemplateDto,
  CareServiceCatalogItemDto,
  ProviderReadinessDto,
  ProviderRoleDefinitionDto,
} from '@hopehub/contracts';

import { AdminApiBase } from './admin-api-base';

@Service()
export class AdminDoctorsApi extends AdminApiBase {
  listProviderRoles() {
    return firstValueFrom(
      this.http.get<{ roles: ProviderRoleDefinitionDto[] }>(
        `${this.apiBase}/admin/provider-roles`,
        {
          params: { includeInactive: 'false' },
        },
      ),
    );
  }

  updateProviderRoles(doctorId: string, payload: { roleCodes: string[]; primaryRoleCode: string }) {
    return firstValueFrom(
      this.http.patch(`${this.apiBase}/admin/doctors/${doctorId}/provider-roles`, payload),
    );
  }

  getDoctors() {
    return this.getDoctorsPaged({});
  }

  getPendingDoctors() {
    return this.getPendingDoctorsPaged({});
  }

  getDoctorsPaged(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    sortBy?: DoctorSortField;
    sortDirection?: SortDirection;
    workspace?: 'homeopathy' | 'hope-hub';
    supportPath?: string;
  }) {
    return firstValueFrom(
      this.http.get<{ doctors: Array<any>; pagination: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.DOCTORS}`,
        {
          params: {
            page: String(params.page ?? 1),
            pageSize: String(params.pageSize ?? PAGE_SIZES.DOCTORS),
            q: params.q ?? '',
            status: params.status ?? FILTER_ALL,
            sortBy: params.sortBy ?? 'createdAt',
            sortDirection: params.sortDirection ?? SORT_DIRECTIONS.DESC,
            workspace: params.workspace ?? '',
            supportPath: params.supportPath ?? '',
          },
        },
      ),
    );
  }

  getPendingDoctorsPaged(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    workspace?: 'homeopathy' | 'hope-hub';
    supportPath?: string;
  }) {
    return firstValueFrom(
      this.http.get<{ pendingDoctors: Array<any>; pagination: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.DOCTORS_PENDING}`,
        {
          params: {
            page: String(params.page ?? 1),
            pageSize: String(params.pageSize ?? PAGE_SIZES.DOCTORS),
            q: params.q ?? '',
            workspace: params.workspace ?? '',
            supportPath: params.supportPath ?? '',
          },
        },
      ),
    );
  }

  approveDoctor(doctorId: string) {
    return firstValueFrom(
      this.http.post(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/approve`, {}),
    );
  }

  reviewServicePricing(serviceId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) {
    return firstValueFrom(
      this.http.patch(`${this.apiBase}/admin/doctors/services/${serviceId}/pricing-approval`, {
        decision,
        reason: reason || null,
      }),
    );
  }

  getPendingPricingApprovals() {
    return firstValueFrom(
      this.http.get<{ reviews: Array<any> }>(`${this.apiBase}/admin/doctors/pricing-approvals`),
    );
  }

  rejectDoctor(doctorId: string, reason?: string) {
    return firstValueFrom(
      this.http.post(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/reject`, {
        reason: reason || null,
      }),
    );
  }

  setDoctorStatus(doctorId: string, isActive: boolean) {
    return firstValueFrom(
      this.http.put(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/status`, { isActive }),
    );
  }

  setDoctorSuspension(doctorId: string, payload: { suspended: boolean; reason?: string | null }) {
    return firstValueFrom(
      this.http.put(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/suspension`, payload),
    );
  }

  getDoctorReadiness(doctorId: string) {
    return firstValueFrom(
      this.http.get<{ readiness: ProviderReadinessDto }>(
        `${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/readiness`,
      ),
    );
  }

  updateDoctor(
    doctorId: string,
    payload: {
      name: string;
      email: string;
      gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
      mobile?: string;
      specialty?: string;
      registrationNo?: string;
      designation?: string;
      department?: string;
      isAvailable: boolean;
      doctorType?: string;
      specialtyFocus?: string | null;
      bio?: string | null;
      showOnWebsite?: boolean;
      websiteOrder?: number | null;
      yearsOfExperience?: number | null;
      focusAreas?: string[];
      mentalHealthProfile?: {
        primaryRoleCode?: string;
        roleCodes?: string[];
        careTeamType?: string;
        careTeamTypes?: string[];
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
        autoMatchEnabled?: boolean;
        acceptingNewUsers?: boolean;
        maxSessionsPerDay?: number | null;
        maxSessionsPerWeek?: number | null;
        services?: Array<{
          id?: string;
          title: string;
          description?: string | null;
          pricingMode?:
            | 'FIXED'
            | 'FREE_INTRO'
            | 'DISCOUNTED_FIRST'
            | 'PACKAGE'
            | 'FREE_VOLUNTEER'
            | 'PER_MINUTE';
          priceInPaise?: number;
          firstSessionPriceInPaise?: number | null;
          offerEndsAt?: string | null;
          offerBookingLimit?: number | null;
          pauseOfferWhenNoSlots?: boolean;
          approvalStatus?: string;
          approvalReason?: string | null;
          followUpPriceInPaise?: number | null;
          followUpSessionLimit?: number | null;
          introSessionLimit?: number;
          packageSessionCount?: number | null;
          packagePriceInPaise?: number | null;
          freeMinutes?: number;
          pricePerMinuteInPaise?: number | null;
          currency?: string;
          durationMinutes?: number;
          isFree?: boolean;
          isActive?: boolean;
          sortOrder?: number;
        }>;
      };
    },
  ) {
    return firstValueFrom(
      this.http.put(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}`, payload),
    );
  }

  createDoctor(payload: {
    name: string;
    email: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
    mobile?: string;
    password: string;
    specialty?: string;
    registrationNo?: string;
    designation?: string;
    department?: string;
    doctorType?: string;
    specialtyFocus?: string | null;
    mentalHealthProfile?: {
      primaryRoleCode?: string;
      roleCodes?: string[];
      careTeamType?: string;
      careTeamTypes?: string[];
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
      autoMatchEnabled?: boolean;
      acceptingNewUsers?: boolean;
      maxSessionsPerDay?: number | null;
      maxSessionsPerWeek?: number | null;
      services?: Array<{
        id?: string;
        title: string;
        description?: string | null;
        pricingMode?:
          'FIXED' | 'FREE_INTRO' | 'DISCOUNTED_FIRST' | 'PACKAGE' | 'FREE_VOLUNTEER' | 'PER_MINUTE';
        priceInPaise?: number;
        firstSessionPriceInPaise?: number | null;
        offerEndsAt?: string | null;
        offerBookingLimit?: number | null;
        pauseOfferWhenNoSlots?: boolean;
        approvalStatus?: string;
        approvalReason?: string | null;
        followUpPriceInPaise?: number | null;
        followUpSessionLimit?: number | null;
        introSessionLimit?: number;
        packageSessionCount?: number | null;
        packagePriceInPaise?: number | null;
        freeMinutes?: number;
        pricePerMinuteInPaise?: number | null;
        currency?: string;
        durationMinutes?: number;
        isFree?: boolean;
        isActive?: boolean;
        sortOrder?: number;
      }>;
    };
  }) {
    return firstValueFrom(this.http.post(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}`, payload));
  }

  setDoctorWebsiteOrder(doctorId: string, websiteOrder: number | null) {
    return firstValueFrom(
      this.http.patch(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/website-order`, {
        websiteOrder,
      }),
    );
  }

  getSiteConfig() {
    return firstValueFrom(
      this.http.get<{
        config: Array<{
          key: string;
          value: string;
          label: string;
          description: string;
          source: 'default' | 'custom';
        }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.SITE_CONFIG}`),
    );
  }

  setSiteConfig(key: string, value: string) {
    return firstValueFrom(
      this.http.patch(`${this.apiBase}${API_PATHS.ADMIN.SITE_CONFIG}/${key}`, { value }),
    );
  }

  setSiteConfigBulk(entries: Array<{ key: string; value: string }>) {
    return firstValueFrom(
      this.http.patch(`${this.apiBase}${API_PATHS.ADMIN.SITE_CONFIG}`, { entries }),
    );
  }

  restoreSiteConfigDefault(key: string) {
    return firstValueFrom(
      this.http.post(`${this.apiBase}${API_PATHS.ADMIN.SITE_CONFIG}/${key}/restore-default`, {}),
    );
  }

  listCareTeamPricingTemplates() {
    return firstValueFrom(
      this.http.get<{ templates: CarePricingTemplateDto[] }>(
        `${this.apiBase}/hope-hub/care-team-pricing-templates`,
      ),
    );
  }

  listCareTeamServiceOptions() {
    return firstValueFrom(
      this.http.get<{ options: CareServiceCatalogItemDto[] }>(
        `${this.apiBase}/hope-hub/care-team-service-options`,
      ),
    );
  }

  listAdminCareTeamServiceOptions() {
    return firstValueFrom(
      this.http.get<{ options: CareServiceCatalogItemDto[] }>(
        `${this.apiBase}/admin/hope-hub/care-service-options`,
      ),
    );
  }

  createCareTeamServiceOption(
    payload: Omit<CareServiceCatalogItemDto, 'id' | 'isDefault' | 'createdAt' | 'updatedAt'>,
  ) {
    return firstValueFrom(
      this.http.post<{ option: CareServiceCatalogItemDto }>(
        `${this.apiBase}/admin/hope-hub/care-service-options`,
        payload,
      ),
    );
  }

  updateCareTeamServiceOption(
    id: string,
    payload: Partial<
      Omit<CareServiceCatalogItemDto, 'id' | 'isDefault' | 'createdAt' | 'updatedAt'>
    >,
  ) {
    return firstValueFrom(
      this.http.put<{ option: CareServiceCatalogItemDto }>(
        `${this.apiBase}/admin/hope-hub/care-service-options/${encodeURIComponent(id)}`,
        payload,
      ),
    );
  }

  deactivateCareTeamServiceOption(id: string) {
    return firstValueFrom(
      this.http.delete<{ option: CareServiceCatalogItemDto }>(
        `${this.apiBase}/admin/hope-hub/care-service-options/${encodeURIComponent(id)}`,
      ),
    );
  }

  listAdminCarePricingTemplates() {
    return firstValueFrom(
      this.http.get<{ templates: CarePricingTemplateDto[] }>(
        `${this.apiBase}/admin/hope-hub/care-pricing-templates`,
      ),
    );
  }

  createCarePricingTemplate(
    payload: Omit<CarePricingTemplateDto, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    return firstValueFrom(
      this.http.post<{ template: CarePricingTemplateDto }>(
        `${this.apiBase}/admin/hope-hub/care-pricing-templates`,
        payload,
      ),
    );
  }

  updateCarePricingTemplate(
    id: string,
    payload: Partial<Omit<CarePricingTemplateDto, 'id' | 'createdAt' | 'updatedAt'>>,
  ) {
    return firstValueFrom(
      this.http.put<{ template: CarePricingTemplateDto }>(
        `${this.apiBase}/admin/hope-hub/care-pricing-templates/${encodeURIComponent(id)}`,
        payload,
      ),
    );
  }

  deactivateCarePricingTemplate(id: string) {
    return firstValueFrom(
      this.http.delete<{ template: CarePricingTemplateDto }>(
        `${this.apiBase}/admin/hope-hub/care-pricing-templates/${encodeURIComponent(id)}`,
      ),
    );
  }

  // ── Testimonials ──────────────────────────────────────────────────────────
  listTestimonials() {
    return firstValueFrom(
      this.http.get<{ testimonials: any[] }>(`${this.apiBase}${API_PATHS.ADMIN.TESTIMONIALS}`),
    );
  }
  createTestimonial(payload: any) {
    return firstValueFrom(
      this.http.post<{ testimonial: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TESTIMONIALS}`,
        payload,
      ),
    );
  }
  updateTestimonial(id: string, payload: any) {
    return firstValueFrom(
      this.http.patch<{ testimonial: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TESTIMONIAL_BY_ID(id)}`,
        payload,
      ),
    );
  }
  deleteTestimonial(id: string) {
    return firstValueFrom(
      this.http.delete(`${this.apiBase}${API_PATHS.ADMIN.TESTIMONIAL_BY_ID(id)}`),
    );
  }

  // ── FAQ ───────────────────────────────────────────────────────────────────
  listFaq() {
    return firstValueFrom(
      this.http.get<{ entries: any[] }>(`${this.apiBase}${API_PATHS.ADMIN.FAQ}`),
    );
  }
  createFaqEntry(payload: any) {
    return firstValueFrom(
      this.http.post<{ entry: any }>(`${this.apiBase}${API_PATHS.ADMIN.FAQ}`, payload),
    );
  }
  updateFaqEntry(id: string, payload: any) {
    return firstValueFrom(
      this.http.patch<{ entry: any }>(`${this.apiBase}${API_PATHS.ADMIN.FAQ_BY_ID(id)}`, payload),
    );
  }
  deleteFaqEntry(id: string) {
    return firstValueFrom(this.http.delete(`${this.apiBase}${API_PATHS.ADMIN.FAQ_BY_ID(id)}`));
  }

  // ── Blog ──────────────────────────────────────────────────────────────────
  getBlogStats() {
    return firstValueFrom(
      this.http.get<{ stats: Record<string, number> }>(
        `${this.apiBase}${API_PATHS.ADMIN.BLOG_STATS}`,
      ),
    );
  }
  listBlogPosts() {
    return firstValueFrom(
      this.http.get<{ posts: any[]; categories: string[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.BLOG}`,
      ),
    );
  }
  createBlogPost(payload: any) {
    return firstValueFrom(
      this.http.post<{ post: any }>(`${this.apiBase}${API_PATHS.ADMIN.BLOG}`, payload),
    );
  }
  updateBlogPost(id: string, payload: any) {
    return firstValueFrom(
      this.http.patch<{ post: any }>(`${this.apiBase}${API_PATHS.ADMIN.BLOG_BY_ID(id)}`, payload),
    );
  }
  deleteBlogPost(id: string) {
    return firstValueFrom(this.http.delete(`${this.apiBase}${API_PATHS.ADMIN.BLOG_BY_ID(id)}`));
  }
  listBlogComments(status?: 'all' | 'pending' | 'approved') {
    const params = status && status !== 'all' ? `?status=${status}` : '';
    return firstValueFrom(
      this.http.get<{ comments: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.BLOG_COMMENTS}${params}`,
      ),
    );
  }
  moderateBlogComment(id: string, isApproved: boolean) {
    return firstValueFrom(
      this.http.patch<{ comment: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.BLOG_COMMENT_BY_ID(id)}`,
        { isApproved },
      ),
    );
  }
  deleteBlogComment(id: string) {
    return firstValueFrom(
      this.http.delete(`${this.apiBase}${API_PATHS.ADMIN.BLOG_COMMENT_BY_ID(id)}`),
    );
  }

  getOnlineDoctorStats() {
    return firstValueFrom(
      this.http.get<{ stats: Record<string, number> }>(
        `${this.apiBase}${API_PATHS.ADMIN.ONLINE_DOCTORS_STATS}`,
      ),
    );
  }
  listOnlineDoctors() {
    return firstValueFrom(
      this.http.get<{ liveDoctors: any[]; sessions: any[]; instantQueue: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.ONLINE_DOCTORS}`,
      ),
    );
  }

  // ── Chat Inbox ────────────────────────────────────────────────────────────
  getChatSessionStats() {
    return firstValueFrom(
      this.http.get<{
        stats: {
          total: number;
          loggedIn: number;
          anonymous: number;
          needsOperator: number;
          active: number;
        };
      }>(`${this.apiBase}${API_PATHS.ADMIN.CHAT_SESSION_STATS}`),
    );
  }
  listChatSessions(status?: string, page = 1) {
    const params = new URLSearchParams({ page: String(page), pageSize: '30' });
    if (status) params.set('status', status);
    return firstValueFrom(
      this.http.get<{ sessions: any[]; pagination: { total: number; totalPages: number } }>(
        `${this.apiBase}${API_PATHS.ADMIN.CHAT_SESSIONS}?${params}`,
      ),
    );
  }
  getChatSession(id: string) {
    return firstValueFrom(
      this.http.get<{ session: any }>(`${this.apiBase}${API_PATHS.ADMIN.CHAT_SESSION_BY_ID(id)}`),
    );
  }
  resolveChatSession(id: string, note?: string) {
    return firstValueFrom(
      this.http.patch(`${this.apiBase}${API_PATHS.ADMIN.CHAT_SESSION_RESOLVE(id)}`, { note }),
    );
  }
  sendChatOperatorMessage(id: string, content: string) {
    return firstValueFrom(
      this.http.post<{ message: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.CHAT_SESSION_MESSAGE(id)}`,
        { content },
      ),
    );
  }

  // ── Visitor leads (website inquiries) ───────────────────────────────────────
  getVisitorLeadStats() {
    return firstValueFrom(
      this.http.get<{
        stats: {
          total: number;
          newLeads: number;
          needsCallback: number;
          called: number;
          registered: number;
          bySource: Record<string, number>;
        };
      }>(`${this.apiBase}${API_PATHS.ADMIN.VISITOR_LEAD_STATS}`),
    );
  }

  listVisitorLeads(
    filters: {
      followUpStatus?: string;
      source?: string;
      dateFrom?: string;
      dateTo?: string;
      notInterestedOnly?: boolean;
    } = {},
    page = 1,
  ) {
    const params = new URLSearchParams({ page: String(page), pageSize: '30' });
    if (filters.followUpStatus) params.set('followUpStatus', filters.followUpStatus);
    if (filters.source) params.set('source', filters.source);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.notInterestedOnly) params.set('notInterestedOnly', 'true');
    return firstValueFrom(
      this.http.get<{ leads: any[]; pagination: { total: number; totalPages: number } }>(
        `${this.apiBase}${API_PATHS.ADMIN.VISITOR_LEADS}?${params}`,
      ),
    );
  }

  exportVisitorLeadsCsv(
    filters: {
      followUpStatus?: string;
      source?: string;
      dateFrom?: string;
      dateTo?: string;
      notInterestedOnly?: boolean;
    } = {},
  ) {
    const params = new URLSearchParams();
    if (filters.followUpStatus) params.set('followUpStatus', filters.followUpStatus);
    if (filters.source) params.set('source', filters.source);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.notInterestedOnly) params.set('notInterestedOnly', 'true');
    const suffix = params.toString() ? `?${params}` : '';
    return firstValueFrom(
      this.http.get(`${this.apiBase}${API_PATHS.ADMIN.VISITOR_LEAD_EXPORT}${suffix}`, {
        responseType: 'text',
      }),
    );
  }

  getVisitorLead(id: string) {
    return firstValueFrom(
      this.http.get<{ lead: any }>(`${this.apiBase}${API_PATHS.ADMIN.VISITOR_LEAD_BY_ID(id)}`),
    );
  }

  updateVisitorLeadFollowUp(
    id: string,
    payload: {
      followUpStatus: string;
      operatorNote?: string;
      visitorIssue?: string;
      notInterestedReasonPreset?: string;
      notInterestedReasonDetail?: string;
      markCalled?: boolean;
    },
  ) {
    return firstValueFrom(
      this.http.patch<{ lead: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.VISITOR_LEAD_FOLLOW_UP(id)}`,
        payload,
      ),
    );
  }

  listAssignableLeadProviders(safety = false) {
    return firstValueFrom(
      this.http.get<{
        providers: Array<{
          doctorId: string;
          providerId: string;
          name: string;
          email?: string | null;
          specialty?: string | null;
          designation?: string | null;
          assignmentType: 'VOLUNTEER' | 'PSYCHOLOGIST' | 'ADMIN';
        }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.VISITOR_LEAD_ASSIGNABLE_PROVIDERS}`, {
        params: { safety: String(safety) },
      }),
    );
  }

  assignVisitorLead(id: string, providerId: string) {
    return firstValueFrom(
      this.http.post<{ lead: any; assignment: any; provider: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.VISITOR_LEAD_ASSIGN(id)}`,
        { providerId },
      ),
    );
  }

  cancelVisitorLeadAssignment(assignmentId: string) {
    return firstValueFrom(
      this.http.post<{ lead: any; assignment: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.VISITOR_LEAD_ASSIGNMENT_CANCEL(assignmentId)}`,
        {},
      ),
    );
  }

  bookVisitorLeadConsultation(
    id: string,
    payload: { diseaseId: string; storeId?: string; collectCash?: boolean; notes?: string },
  ) {
    return firstValueFrom(
      this.http.post<{ lead: any; consultation: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.VISITOR_LEAD_BOOK(id)}`,
        payload,
      ),
    );
  }

  getLeadFunnelReport(days = 30) {
    return firstValueFrom(
      this.http.get<{
        windowDays: number;
        summary: {
          totalLeads: number;
          needsCallback: number;
          called: number;
          registered: number;
          booked: number;
          notInterested?: number;
        };
        funnel: Array<{
          key: string;
          label: string;
          total: number;
          conversionFromStart: number;
          conversionFromPrevious: number;
        }>;
        bySource: Array<{ source: string; total: number; booked: number; conversionRate: number }>;
        notInterestedByReason?: Array<{ reason: string; count: number }>;
        topVisitorIssues?: Array<{ issue: string; count: number }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.LEAD_FUNNEL}?days=${days}`),
    );
  }
}
