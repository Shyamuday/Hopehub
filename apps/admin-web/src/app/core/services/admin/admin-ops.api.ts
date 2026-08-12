import { Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminAuth } from '../admin-auth';
import { API_PATHS } from '../../constants/api-paths.constants';
import { AdminApiBase } from './admin-api-base';

@Service()
export class AdminOpsApi extends AdminApiBase {
  searchPatients(q: string, params?: { clinicStoreId?: string; scope?: string }) {
    return firstValueFrom(
      this.http.get<{ patients: Array<any>; scopeUsed?: string; hint?: string }>(
        `${this.apiBase}${API_PATHS.ADMIN.PATIENTS_SEARCH}`,
        {
          params: {
            q,
            ...(params?.clinicStoreId ? { clinicStoreId: params.clinicStoreId } : {}),
            ...(params?.scope ? { scope: params.scope } : {}),
          },
        },
      ),
    );
  }

  registerPatient(payload: {
    name: string;
    email?: string;
    mobile?: string;
    homeClinicStoreId?: string | null;
  }) {
    return firstValueFrom(
      this.http.post<{ patient: any }>(`${this.apiBase}${API_PATHS.ADMIN.PATIENTS}`, payload),
    );
  }

  getPurchaseOrders(params?: { status?: string; storeId?: string; supplierId?: string }) {
    return firstValueFrom(
      this.http.get<{ orders: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.PURCHASE_ORDERS}`, {
        params: {
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.storeId ? { storeId: params.storeId } : {}),
          ...(params?.supplierId ? { supplierId: params.supplierId } : {}),
        },
      }),
    );
  }

  getPurchaseOrder(id: string) {
    return firstValueFrom(
      this.http.get<any>(`${this.apiBase}${API_PATHS.ADMIN.PURCHASE_ORDERS}/${id}`),
    );
  }

  createPurchaseOrder(payload: {
    supplierId: string;
    storeId: string;
    notes?: string;
    send?: boolean;
    lines: Array<{ medicineId: string; qtyOrdered: number; unitPriceInPaise: number }>;
  }) {
    return firstValueFrom(
      this.http.post<any>(`${this.apiBase}${API_PATHS.ADMIN.PURCHASE_ORDERS}`, payload),
    );
  }

  getSuppliers() {
    return firstValueFrom(
      this.http.get<{ suppliers: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.SUPPLIERS}`),
    );
  }

  searchMedicines(q: string, page = 1, includeInactive = false) {
    return firstValueFrom(
      this.http.get<{ medicines: Array<any>; pagination: { total: number } }>(
        `${this.apiBase}${API_PATHS.ADMIN.MEDICINES}`,
        {
          params: {
            q,
            page: String(page),
            pageSize: '20',
            ...(includeInactive ? { includeInactive: 'true' } : {}),
          },
        },
      ),
    );
  }

  listMedicines(params?: { q?: string; page?: number; includeInactive?: boolean }) {
    return this.searchMedicines(
      params?.q ?? '',
      params?.page ?? 1,
      params?.includeInactive ?? true,
    );
  }

  createMedicine(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ medicine: any }>(`${this.apiBase}${API_PATHS.ADMIN.MEDICINES}`, payload),
    );
  }

  updateMedicine(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.put<{ medicine: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.MEDICINES}/${id}`,
        payload,
      ),
    );
  }

  listSuppliers(includeInactive = true) {
    return firstValueFrom(
      this.http.get<{ suppliers: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.SUPPLIERS}`, {
        params: includeInactive ? { includeInactive: 'true' } : {},
      }),
    );
  }

  createSupplier(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ supplier: any }>(`${this.apiBase}${API_PATHS.ADMIN.SUPPLIERS}`, payload),
    );
  }

  updateSupplier(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.patch<{ supplier: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.SUPPLIERS}/${id}`,
        payload,
      ),
    );
  }

  getAdmins() {
    return firstValueFrom(
      this.http.get<{ admins: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.ADMINS}`),
    );
  }

  getUsers(params?: {
    q?: string;
    role?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: string;
  }) {
    return firstValueFrom(
      this.http.get<{
        users: Array<any>;
        filters: { roles: string[]; statuses: string[] };
        summary: { total: number; roleCounts: Array<{ role: string; count: number }> };
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      }>(`${this.apiBase}${API_PATHS.ADMIN.USERS}`, {
        params: {
          page: String(params?.page ?? 1),
          pageSize: String(params?.pageSize ?? 20),
          sortBy: params?.sortBy ?? 'createdAt',
          sortDirection: params?.sortDirection ?? 'desc',
          ...(params?.q ? { q: params.q } : {}),
          ...(params?.role ? { role: params.role } : {}),
          ...(params?.status ? { status: params.status } : {}),
        },
      }),
    );
  }

  createAdmin(payload: { name: string; email: string; password: string; mobile?: string }) {
    return firstValueFrom(
      this.http.post<{ admin: any }>(`${this.apiBase}${API_PATHS.ADMIN.ADMINS}`, payload),
    );
  }

  setUserRole(id: string, role: string) {
    return firstValueFrom(
      this.http.patch<{ user: any }>(`${this.apiBase}${API_PATHS.ADMIN.USER_ROLE(id)}`, { role }),
    );
  }

  setUserStatus(id: string, isActive: boolean) {
    return firstValueFrom(
      this.http.patch<{ user: any }>(`${this.apiBase}${API_PATHS.ADMIN.USER_STATUS(id)}`, {
        isActive,
      }),
    );
  }

  setAdminStatus(id: string, isActive: boolean) {
    return firstValueFrom(
      this.http.patch<{ admin: any }>(`${this.apiBase}${API_PATHS.ADMIN.ADMIN_STATUS(id)}`, {
        isActive,
      }),
    );
  }

  getTelegramBots() {
    return firstValueFrom(
      this.http.get<{ bots: any[]; sessions: any[]; events: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_BOTS}`,
      ),
    );
  }

  setupTelegramBot(
    slug: string,
    payload?: { dropPendingUpdates?: boolean; publicApiUrl?: string },
  ) {
    return firstValueFrom(
      this.http.post<{ ok: boolean; webhook: unknown }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_BOT_SETUP(slug)}`,
        payload ?? {},
      ),
    );
  }

  setupAllTelegramBots(payload?: { dropPendingUpdates?: boolean; publicApiUrl?: string }) {
    return firstValueFrom(
      this.http.post<{ ok: boolean; results: unknown[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_BOTS_SETUP_ALL}`,
        payload ?? {},
      ),
    );
  }

  unlinkTelegramBotSession(id: string) {
    return firstValueFrom(
      this.http.post<{ session: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_BOT_SESSION_UNLINK(id)}`,
        {},
      ),
    );
  }

  getTelegramGroupHelpConfig() {
    return firstValueFrom(
      this.http.get<{
        tokenConfigured: boolean;
        config: Array<{
          key: string;
          label: string;
          description: string;
          section: 'connection' | 'messages' | 'moderation' | 'commands';
          type: 'text' | 'textarea' | 'number' | 'select';
          maxLength: number;
          placeholder?: string;
          options?: string[];
          value: string;
        }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP}`),
    );
  }

  saveTelegramGroupHelpConfig(entries: Array<{ key: string; value: string }>) {
    return firstValueFrom(
      this.http.patch<{ config: any[] }>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP}`, {
        entries,
      }),
    );
  }

  testTelegramGroupHelpConnection() {
    return firstValueFrom(
      this.http.post<{
        tokenConfigured: boolean;
        ok: boolean;
        message?: string;
        me?: unknown;
        webhook?: unknown;
        chat?: unknown;
        chatError?: string | null;
      }>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_TEST}`, {}),
    );
  }

  uploadTelegramGroupHelpImage(file: File) {
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
      }>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_MEDIA}`, formData),
    );
  }

  sendTelegramGroupHelpMessage(payload: { message: string; imageUrl?: string; pin?: boolean }) {
    return firstValueFrom(
      this.http.post<{ ok: boolean; message: any; pinned?: unknown }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_SEND}`,
        payload,
      ),
    );
  }

  updateConsultationStatus(
    consultationId: string,
    status: string,
    options?: { reason?: string; restorePackageSession?: boolean },
  ) {
    return firstValueFrom(
      this.http.patch<{ consultation: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.CONSULTATION_STATUS(consultationId)}`,
        { status, ...(options || {}) },
      ),
    );
  }

  updateConsultationOutcome(
    consultationId: string,
    data: {
      outcome: string;
      privateNote?: string;
      userSummary?: string;
      recommendedNextStep?: string;
      restorePackageSession?: boolean;
      holdProviderPayout?: boolean;
    },
  ) {
    return firstValueFrom(
      this.http.post<{ consultation: any; sessionOutcome: any }>(
        `${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/outcome`,
        data,
      ),
    );
  }

  getInventoryOverview() {
    return firstValueFrom(
      this.http.get<{ stores: Array<any> }>(`${this.apiBase}${API_PATHS.ADMIN.INVENTORY_OVERVIEW}`),
    );
  }

  getStoreStock(storeId: string, params?: { q?: string; status?: string; page?: number }) {
    return firstValueFrom(
      this.http.get<{ store: any; stocks: Array<any>; pagination: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.INVENTORY_STORE_STOCK(storeId)}`,
        {
          params: {
            page: String(params?.page ?? 1),
            pageSize: '50',
            ...(params?.q ? { q: params.q } : {}),
            ...(params?.status ? { status: params.status } : {}),
          },
        },
      ),
    );
  }

  getNotificationTemplates() {
    return firstValueFrom(
      this.http.get<{ templates: Array<any> }>(
        `${this.apiBase}${API_PATHS.ADMIN.NOTIFICATION_TEMPLATES}`,
      ),
    );
  }

  createNotificationTemplate(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ template: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.NOTIFICATION_TEMPLATES}`,
        payload,
      ),
    );
  }

  updateNotificationTemplate(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.patch<{ template: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.NOTIFICATION_TEMPLATES}/${id}`,
        payload,
      ),
    );
  }

  getNotificationBroadcasts() {
    return firstValueFrom(
      this.http.get<{ broadcasts: Array<any> }>(
        `${this.apiBase}${API_PATHS.ADMIN.NOTIFICATION_BROADCASTS}`,
      ),
    );
  }

  sendNotificationBroadcast(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ broadcast: any; recipientCount: number }>(
        `${this.apiBase}${API_PATHS.ADMIN.NOTIFICATION_BROADCAST}`,
        payload,
      ),
    );
  }

  getEcosystemUsersMeta() {
    return firstValueFrom(
      this.http.get<{ roles: string[]; stores: any[]; corporates: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_USERS_META}`,
      ),
    );
  }

  getEcosystemUsers(role?: string) {
    return firstValueFrom(
      this.http.get<{ users: any[] }>(`${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_USERS}`, {
        params: role ? { role } : {},
      }),
    );
  }

  createEcosystemUser(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ user: any }>(`${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_USERS}`, payload),
    );
  }

  updateEcosystemUser(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.patch<{ user: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_USERS}/${id}`,
        payload,
      ),
    );
  }

  setEcosystemUserStatus(id: string, isActive: boolean) {
    return firstValueFrom(
      this.http.patch<{ user: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_USERS_STATUS(id)}`,
        { isActive },
      ),
    );
  }

  getEcosystemCorporates() {
    return firstValueFrom(
      this.http.get<{ accounts: any[] }>(`${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_CORPORATES}`),
    );
  }

  createEcosystemCorporate(payload: { code: string; name: string; contactEmail?: string }) {
    return firstValueFrom(
      this.http.post<{ account: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_CORPORATES}`,
        payload,
      ),
    );
  }

  enrollCorporatePatient(corporateId: string, patientId: string) {
    return firstValueFrom(
      this.http.post<{ enrollment: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_ENROLLMENTS(corporateId)}`,
        {
          patientId,
        },
      ),
    );
  }

  getCorporateEnrollments(corporateId: string) {
    return firstValueFrom(
      this.http.get<{ enrollments: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_ENROLLMENTS(corporateId)}`,
      ),
    );
  }

  removeCorporateEnrollment(corporateId: string, patientId: string) {
    return firstValueFrom(
      this.http.delete(
        `${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_ENROLLMENTS(corporateId)}/${patientId}`,
      ),
    );
  }

  getInsuranceClaimsAdmin() {
    return firstValueFrom(
      this.http.get<{ claims: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.ECOSYSTEM_INSURANCE_CLAIMS}`,
      ),
    );
  }

  getPortalUsersMeta() {
    return firstValueFrom(
      this.http.get<{
        roles: string[];
        stores: any[];
        warehouses: any[];
        suppliers: any[];
        diagnosticCenters: any[];
      }>(`${this.apiBase}${API_PATHS.ADMIN.PORTAL_USERS_META}`),
    );
  }

  getPortalUsers(role?: string) {
    return firstValueFrom(
      this.http.get<{ users: any[] }>(`${this.apiBase}${API_PATHS.ADMIN.PORTAL_USERS}`, {
        params: role ? { role } : {},
      }),
    );
  }

  createPortalUser(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ user: any }>(`${this.apiBase}${API_PATHS.ADMIN.PORTAL_USERS}`, payload),
    );
  }

  updatePortalUser(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.patch<{ user: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.PORTAL_USERS}/${id}`,
        payload,
      ),
    );
  }

  setPortalUserStatus(id: string, isActive: boolean) {
    return firstValueFrom(
      this.http.patch<{ user: any }>(`${this.apiBase}${API_PATHS.ADMIN.PORTAL_USER_STATUS(id)}`, {
        isActive,
      }),
    );
  }

  listVacancies(params?: { status?: string; department?: string }) {
    return firstValueFrom(
      this.http.get<{ vacancies: any[]; summary: { DRAFT: number; OPEN: number; CLOSED: number } }>(
        `${this.apiBase}${API_PATHS.ADMIN.VACANCIES}`,
        {
          params: {
            ...(params?.status ? { status: params.status } : {}),
            ...(params?.department ? { department: params.department } : {}),
          },
        },
      ),
    );
  }

  createVacancy(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ vacancy: any }>(`${this.apiBase}${API_PATHS.ADMIN.VACANCIES}`, payload),
    );
  }

  updateVacancy(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.patch<{ vacancy: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.VACANCY_BY_ID(id)}`,
        payload,
      ),
    );
  }

  closeVacancy(id: string) {
    return firstValueFrom(
      this.http.delete<{ vacancy: any }>(`${this.apiBase}${API_PATHS.ADMIN.VACANCY_BY_ID(id)}`),
    );
  }

  listCounsellorApplications(params?: { status?: string }) {
    return firstValueFrom(
      this.http.get<{
        applications: any[];
        summary: {
          NEW: number;
          REVIEWING: number;
          SHORTLISTED: number;
          REJECTED: number;
          ONBOARDED: number;
        };
      }>(`${this.apiBase}${API_PATHS.ADMIN.COUNSELLOR_APPLICATIONS}`, {
        params: params?.status ? { status: params.status } : {},
      }),
    );
  }

  updateCounsellorApplicationStatus(id: string, payload: { status: string; adminNote?: string }) {
    return firstValueFrom(
      this.http.patch<{ application: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.COUNSELLOR_APPLICATION_STATUS(id)}`,
        payload,
      ),
    );
  }

  onboardCounsellorApplication(
    id: string,
    payload: {
      credentialVerified?: boolean;
      supervisionVerified?: boolean;
      orientationCompleted?: boolean;
      onboardingNote?: string;
    },
  ) {
    return firstValueFrom(
      this.http.post<{ contributor: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.COUNSELLOR_APPLICATION_ONBOARD(id)}`,
        payload,
      ),
    );
  }

  updateCareContributorStatus(
    id: string,
    payload: {
      status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
      orientationCompleted?: boolean;
      onboardingNote?: string;
    },
  ) {
    return firstValueFrom(
      this.http.patch<{ contributor: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.CARE_CONTRIBUTOR_STATUS(id)}`,
        payload,
      ),
    );
  }

  listListenerScreeningQuestionSets() {
    return firstValueFrom(
      this.http.get<{ questionSets: any[]; auditLogs: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.LISTENER_SCREENING}`,
      ),
    );
  }

  createListenerScreeningQuestionSet(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ questionSet: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.LISTENER_SCREENING}`,
        payload,
      ),
    );
  }

  updateListenerScreeningQuestionSet(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.patch<{ questionSet: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.LISTENER_SCREENING_BY_ID(id)}`,
        payload,
      ),
    );
  }

  publishListenerScreeningQuestionSet(id: string) {
    return firstValueFrom(
      this.http.post<{ questionSet: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.LISTENER_SCREENING_PUBLISH(id)}`,
        {},
      ),
    );
  }

  listHopeHubLiveGroupReports() {
    return firstValueFrom(
      this.http.get<{ reports: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_LIVE_GROUP_REPORTS}`,
      ),
    );
  }

  reviewHopeHubLiveGroupReport(id: string, status: 'REVIEWED' | 'DISMISSED') {
    return firstValueFrom(
      this.http.post<{ report: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.HOPE_HUB_LIVE_GROUP_REPORT_REVIEW(id)}`,
        { status },
      ),
    );
  }
}
