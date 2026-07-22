import { Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../admin-auth';
import { API_PATHS } from '../../constants/api-paths.constants';
import { FILTER_ALL, SORT_DIRECTIONS } from '../../../shared/constants/filter.constants';
import { PAGE_SIZES } from '../../constants/pagination.constants';
import type { DoctorSortField } from '../../../features/doctors/constants/doctors-list.constants';
import type { SortDirection } from '../../../shared/constants/filter.constants';

import { AdminApiBase } from './admin-api-base';

@Service()
export class AdminDoctorsApi extends AdminApiBase {
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
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
    sortBy?: DoctorSortField;
    sortDirection?: SortDirection;
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
          },
        },
      ),
    );
  }

  getPendingDoctorsPaged(params: { page?: number; pageSize?: number; q?: string }) {
    return firstValueFrom(
      this.http.get<{ pendingDoctors: Array<any>; pagination: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.DOCTORS_PENDING}`,
        {
          params: {
            page: String(params.page ?? 1),
            pageSize: String(params.pageSize ?? PAGE_SIZES.DOCTORS),
            q: params.q ?? '',
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

  rejectDoctor(doctorId: string) {
    return firstValueFrom(
      this.http.post(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/reject`, {}),
    );
  }

  setDoctorStatus(doctorId: string, isActive: boolean) {
    return firstValueFrom(
      this.http.put(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}/status`, { isActive }),
    );
  }

  updateDoctor(
    doctorId: string,
    payload: {
      name: string;
      email: string;
      mobile?: string;
      specialty?: string;
      registrationNo?: string;
      isAvailable: boolean;
      providerType?: string;
      providerCategory?: string;
      specialization?: string;
      doctorType?: string;
      specialtyFocus?: string | null;
      bio?: string | null;
      showOnWebsite?: boolean;
      websiteOrder?: number | null;
      yearsOfExperience?: number | null;
      focusAreas?: string[];
    },
  ) {
    return firstValueFrom(
      this.http.put(`${this.apiBase}${API_PATHS.ADMIN.DOCTORS}/${doctorId}`, payload),
    );
  }

  createDoctor(payload: {
    name: string;
    email: string;
    mobile?: string;
    password: string;
    specialty?: string;
    providerType?: string;
    providerCategory?: string;
    specialization?: string;
    registrationNo?: string;
    doctorType?: string;
    specialtyFocus?: string | null;
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
        config: Array<{ key: string; value: string; label: string; description: string }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.SITE_CONFIG}`),
    );
  }

  setSiteConfig(key: string, value: string) {
    return firstValueFrom(
      this.http.patch(`${this.apiBase}${API_PATHS.ADMIN.SITE_CONFIG}/${key}`, { value }),
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
