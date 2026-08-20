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
      this.http.get<{
        bots: any[];
        sessions: any[];
        events: any[];
        groupHelpCommandAudits?: any[];
        health?: {
          failedWebhookUpdates: number;
          failedGroupHelpCommands: number;
          failedDeliveries: number;
          overdueCampaigns: number;
          needsAttention: boolean;
        };
      }>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_BOTS}`),
    );
  }

  getTelegramBotControls() {
    return firstValueFrom(
      this.http.get<{ controls: any[] }>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_BOT_CONTROLS}`),
    );
  }

  saveTelegramBotControls(entries: Array<{ key: string; value: string }>) {
    return firstValueFrom(
      this.http.patch<{ controls: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_BOT_CONTROLS}`,
        { entries },
      ),
    );
  }

  previewTelegramBotControls(group: string, entries: Array<{ key: string; value: string }>) {
    return firstValueFrom(
      this.http.post<{ ok: boolean; messageId: number }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_BOT_CONTROLS_PREVIEW}`,
        { group, entries },
      ),
    );
  }

  getTelegramBotControlHistory() {
    return firstValueFrom(
      this.http.get<{ history: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_BOT_CONTROLS_HISTORY}`,
      ),
    );
  }

  restoreTelegramBotControls(id: string) {
    return firstValueFrom(
      this.http.post<{ ok: boolean; restored: number }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_BOT_CONTROLS_RESTORE(id)}`,
        {},
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
        actions: Array<{
          id: string;
          title: string;
          description: string;
          valueKey: string;
          imageUrlKey?: string;
          templateKey: string;
          placeholder: 'message' | 'value' | 'lines';
          applyMode: 'TELEGRAM_ADMIN_CONFIRMATION' | 'DIRECT_PIN';
        }>;
        capabilityGroups: Array<{ title: string; options: readonly string[] }>;
        actionHistory: Array<{
          id: string;
          action: string;
          targetId: string;
          summary?: string | null;
          createdAt: string;
        }>;
        config: Array<{
          key: string;
          label: string;
          description: string;
          section:
            | 'connection'
            | 'messages'
            | 'onboarding'
            | 'moderation'
            | 'content'
            | 'people'
            | 'operations'
            | 'commands';
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

  getTelegramGroupHelpRevisions() {
    return firstValueFrom(
      this.http.get<{ revisions: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_REVISIONS}`,
      ),
    );
  }

  createTelegramGroupHelpRevision(name: string, entries: Array<{ key: string; value: string }>) {
    return firstValueFrom(
      this.http.post<{ revision: any; entryCount: number }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_REVISIONS}`,
        { name, entries },
      ),
    );
  }

  previewTelegramGroupHelpRevision(id: string) {
    return firstValueFrom(
      this.http.get<{ revision: any; changes: any[]; unchanged: number }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_REVISION_PREVIEW(id)}`,
      ),
    );
  }

  publishTelegramGroupHelpRevision(id: string) {
    return firstValueFrom(
      this.http.post<{ ok: boolean; config: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_REVISION_PUBLISH(id)}`,
        {},
      ),
    );
  }

  restoreTelegramGroupHelpRevision(id: string) {
    return firstValueFrom(
      this.http.post<{ ok: boolean; config: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_REVISION_RESTORE(id)}`,
        {},
      ),
    );
  }

  getTelegramGroupHelpMembers(params: {
    scope?: 'main' | 'staff';
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    return firstValueFrom(
      this.http.get<{
        scope: 'main' | 'staff';
        chatId: string;
        page: number;
        pageSize: number;
        total: number;
        synchronizedAt?: string | null;
        nextSyncAt?: string | null;
        members: Array<{
          telegramUserId: string;
          username?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          displayName: string;
          mention: string;
          commandTarget: string;
          nameChangeCount: number;
          telegramAdministrator: boolean;
          telegramAdministratorTitle?: string | null;
        }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_MEMBERS}`, {
        params: {
          scope: params.scope || 'main',
          q: params.q || '',
          page: String(params.page || 1),
          pageSize: String(params.pageSize || 50),
        },
      }),
    );
  }

  getTelegramGroupHelpMemberIdentityHistory(
    telegramUserId: string,
    scope: 'main' | 'staff' = 'main',
  ) {
    return firstValueFrom(
      this.http.get<{
        scope: 'main' | 'staff';
        chatId: string;
        telegramUserId: string;
        history: Array<{
          id: string;
          previousDisplayName?: string | null;
          previousUsername?: string | null;
          displayName?: string | null;
          username?: string | null;
          changedFields: string[];
          source: string;
          observedAt: string;
        }>;
      }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_MEMBER_IDENTITY_HISTORY(telegramUserId)}`,
        { params: { scope } },
      ),
    );
  }

  getTelegramGroupHelpRoles(chatId?: string) {
    return firstValueFrom(
      this.http.get<{
        chatId: string;
        staffGroupId: string;
        assignments: any[];
        customRoles: any[];
        staffMembers: any[];
        permissionGroups: Array<{
          key: string;
          label: string;
          commands: string[];
          defaultEnabled: boolean;
        }>;
      }>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_ROLES}`, {
        params: chatId ? { chatId } : {},
      }),
    );
  }

  updateTelegramGroupHelpStaffPermissions(payload: {
    telegramUserId: string;
    permissions: string[];
    fullAdmin?: boolean;
  }) {
    return firstValueFrom(
      this.http.patch<{ ok: boolean; telegramUserId: string; permissions: string[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_STAFF_PERMISSIONS}`,
        payload,
      ),
    );
  }

  assignTelegramGroupHelpRole(payload: {
    chatId?: string;
    telegramUserId: string;
    role?: 'HELPER' | 'MODERATOR';
    customRoleId?: string;
  }) {
    return firstValueFrom(
      this.http.post<{ assignment: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_ROLES}`,
        payload,
      ),
    );
  }

  revokeTelegramGroupHelpRole(id: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_ROLE(id)}`,
      ),
    );
  }

  saveTelegramGroupHelpCustomRole(payload: {
    chatId?: string;
    name: string;
    permissions: string[];
  }) {
    return firstValueFrom(
      this.http.post<{ role: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CUSTOM_ROLES}`,
        payload,
      ),
    );
  }

  deleteTelegramGroupHelpCustomRole(id: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CUSTOM_ROLE(id)}`,
      ),
    );
  }

  getTelegramGroupHelpModerationCases(chatId?: string) {
    return firstValueFrom(
      this.http.get<{ chatId: string; cases: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_MODERATION_CASES}`,
        { params: chatId ? { chatId } : {} },
      ),
    );
  }

  resolveTelegramGroupHelpModerationCase(
    id: string,
    action: 'APPROVE' | 'NO_ACTION' | 'DELETE' | 'MUTE' | 'KICK' | 'BAN',
  ) {
    return firstValueFrom(
      this.http.post<{ moderationCase: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_MODERATION_CASE_RESOLVE(id)}`,
        { action },
      ),
    );
  }

  testTelegramGroupHelpConnection() {
    return firstValueFrom(
      this.http.post<{
        tokenConfigured: boolean;
        ok: boolean;
        message?: string;
        me?: { id?: number; username?: string };
        webhook?: { url?: string };
        chat?: { id?: number | string; title?: string };
        botMembership?: {
          status?: string;
          can_manage_chat?: boolean;
          can_delete_messages?: boolean;
          can_restrict_members?: boolean;
          can_invite_users?: boolean;
          can_pin_messages?: boolean;
          can_promote_members?: boolean;
          can_manage_video_chats?: boolean;
        };
        missingBotPermissions?: string[];
        chatError?: string | null;
      }>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_TEST}`, {}),
    );
  }

  applyTelegramGroupHelpAction(actionId: string) {
    return firstValueFrom(
      this.http.post<{
        ok: boolean;
        mode: 'APPLIED' | 'TELEGRAM_ADMIN_CONFIRMATION';
        command?: string;
        botUrl?: string;
        message?: string;
      }>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_APPLY}`, { actionId }),
    );
  }

  clearTelegramGroupHelpMenu() {
    return firstValueFrom(
      this.http.post<{ ok: boolean }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CLEAR_MENU}`,
        {},
      ),
    );
  }

  uploadTelegramGroupHelpMedia(file: File) {
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

  getTelegramCampaigns() {
    return firstValueFrom(
      this.http.get<{ campaigns: any[]; botConfigured: boolean }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CAMPAIGNS}`,
      ),
    );
  }

  createTelegramCampaign(payload: any) {
    return firstValueFrom(
      this.http.post<{ campaign: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CAMPAIGNS}`,
        payload,
      ),
    );
  }

  updateTelegramCampaign(id: string, payload: any) {
    return firstValueFrom(
      this.http.put<{ campaign: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CAMPAIGN(id)}`,
        payload,
      ),
    );
  }

  setTelegramCampaignStatus(id: string, isActive: boolean) {
    return firstValueFrom(
      this.http.patch<{ campaign: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CAMPAIGN_STATUS(id)}`,
        { isActive },
      ),
    );
  }

  deleteTelegramCampaign(id: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CAMPAIGN(id)}`,
      ),
    );
  }

  getTelegramCampaignResults(id: string) {
    return firstValueFrom(
      this.http.get<{ results: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CAMPAIGN_RESULTS(id)}`,
      ),
    );
  }

  retryTelegramCampaignDelivery(id: string) {
    return firstValueFrom(
      this.http.post<{ delivery: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_DELIVERY_RETRY(id)}`,
        {},
      ),
    );
  }

  getTelegramCommunityEvents() {
    return firstValueFrom(
      this.http.get<{ events: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_EVENTS}`,
      ),
    );
  }

  createTelegramCommunityEvent(payload: any) {
    return firstValueFrom(
      this.http.post<{ event: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_EVENTS}`,
        payload,
      ),
    );
  }

  updateTelegramCommunityEvent(id: string, payload: any) {
    return firstValueFrom(
      this.http.put<{ event: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_EVENT(id)}`,
        payload,
      ),
    );
  }

  deleteTelegramCommunityEvent(id: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_EVENT(id)}`,
      ),
    );
  }

  getTelegramPendingConfessions() {
    return firstValueFrom(
      this.http.get<{ submissions: any[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CONFESSIONS}`,
      ),
    );
  }

  reviewTelegramConfession(reference: string, action: 'APPROVE' | 'REJECT') {
    return firstValueFrom(
      this.http.post<{ submission: any }>(
        `${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_CONFESSION_REVIEW(reference)}`,
        { action },
      ),
    );
  }

  getTelegramCommunityEngagement() {
    return firstValueFrom(
      this.http.get<any>(`${this.apiBase}${API_PATHS.ADMIN.TELEGRAM_GROUP_HELP_ENGAGEMENT}`),
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
