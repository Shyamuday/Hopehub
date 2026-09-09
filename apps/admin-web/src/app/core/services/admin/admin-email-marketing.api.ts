import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_PATHS } from '../../constants/api-paths.constants';
import { AdminApiBase } from './admin-api-base';

export type EmailCampaignAudience = 'REGISTERED_USERS' | 'PROMOTIONAL_CONTACTS' | 'ALL_ELIGIBLE';

export type EmailAudienceFilter = {
  states?: string[];
  cities?: string[];
  postalCodes?: string[];
  sourceLabels?: string[];
  sourceChannels?: string[];
  sourceSegments?: string[];
  paymentMethods?: string[];
  orderStatuses?: string[];
  tags?: string[];
  productQuery?: string;
  minOrderCount?: number;
  maxOrderCount?: number;
  minTotalOrderValue?: number;
  maxTotalOrderValue?: number;
  lastOrderFrom?: string;
  lastOrderTo?: string;
  hasMobile?: boolean;
};

export type EmailMarketingOverview = {
  registered: number;
  promotional: number;
  converted: number;
  suppressed: number;
  campaigns: number;
  queued: number;
  sent: number;
  emailConfig: {
    configured: boolean;
    provider: string;
    host: string | null;
    port: number;
    from: string;
  };
};

export type EmailMarketingContact = {
  id: string;
  email: string;
  normalizedEmail: string;
  name?: string | null;
  mobile?: string | null;
  alternatePhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  sourceLabel: string;
  sourceChannel?: string | null;
  sourceSegments: string[];
  tags: string[];
  productNames: string[];
  productSkus: string[];
  paymentMethods: string[];
  orderStatuses: string[];
  firstOrderAt?: string | null;
  lastOrderAt?: string | null;
  orderCount: number;
  totalOrderValue: string;
  currency?: string | null;
  consentBasis: string;
  consentCapturedAt: string;
  status: 'ACTIVE' | 'CONVERTED' | 'UNSUBSCRIBED' | 'SUPPRESSED';
  convertedAt?: string | null;
  unsubscribedAt?: string | null;
  lastSentAt?: string | null;
  createdAt: string;
  registeredUser?: { id: string; name: string; role: string } | null;
};

export type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  previewText?: string | null;
  htmlBody: string;
  textBody: string;
  audience: EmailCampaignAudience;
  registeredRole?: string | null;
  audienceFilter?: EmailAudienceFilter | null;
  templateId?: string | null;
  template?: { id: string; name: string } | null;
  status: 'DRAFT' | 'SCHEDULED' | 'QUEUED' | 'SENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  scheduledAt?: string | null;
  queuedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  openedCount: number;
  clickedCount: number;
  createdAt: string;
  createdBy?: { id: string; name: string; email?: string | null } | null;
};

export type EmailCampaignDraft = {
  name: string;
  subject: string;
  previewText: string;
  htmlBody: string;
  textBody: string;
  audience: EmailCampaignAudience;
  registeredRole: string | null;
  audienceFilter: EmailAudienceFilter;
  templateId: string | null;
  scheduledAt: string | null;
  complianceConfirmed: true;
};

export type EmailMarketingTemplate = {
  id: string;
  systemKey?: string | null;
  name: string;
  category: string;
  description?: string | null;
  subject: string;
  previewText?: string | null;
  htmlBody: string;
  textBody: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; email?: string | null } | null;
};

export type EmailMarketingTemplateDraft = Pick<
  EmailMarketingTemplate,
  | 'name'
  | 'category'
  | 'description'
  | 'subject'
  | 'previewText'
  | 'htmlBody'
  | 'textBody'
  | 'isActive'
  | 'sortOrder'
>;

export type MarketingSpreadsheetPreview = {
  fileName: string;
  format: 'CSV' | 'XLSX';
  sheets: Array<{ name: string; rows: number; columns: string[] }>;
  sourceRows: number;
  validContacts: number;
  skippedRows: number;
  mappedFields: string[];
};

export type EmailMarketingFilterOptions = {
  states: string[];
  cities: string[];
  postalCodes: string[];
  sourceLabels: string[];
  sourceChannels: string[];
  sourceSegments: string[];
  paymentMethods: string[];
  orderStatuses: string[];
  tags: string[];
};

export type EmailCampaignDelivery = {
  id: string;
  email: string;
  name?: string | null;
  status:
    | 'QUEUED'
    | 'PROCESSING'
    | 'SENT'
    | 'FAILED'
    | 'SKIPPED_SUPPRESSED'
    | 'SKIPPED_REGISTERED'
    | 'CANCELLED';
  attempts: number;
  providerMessageId?: string | null;
  lastError?: string | null;
  sentAt?: string | null;
  firstOpenedAt?: string | null;
  openCount: number;
  firstClickedAt?: string | null;
  clickCount: number;
  unsubscribedAt?: string | null;
  createdAt: string;
  campaign: { id: string; name: string; subject: string };
};

@Injectable({ providedIn: 'root' })
export class AdminEmailMarketingApi extends AdminApiBase {
  overview() {
    return firstValueFrom(
      this.http.get<EmailMarketingOverview>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_OVERVIEW}`,
      ),
    );
  }

  templates(includeInactive = true) {
    return firstValueFrom(
      this.http.get<{ templates: EmailMarketingTemplate[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_TEMPLATES}`,
        { params: { includeInactive: String(includeInactive) } },
      ),
    );
  }

  createTemplate(payload: EmailMarketingTemplateDraft) {
    return firstValueFrom(
      this.http.post<{ template: EmailMarketingTemplate }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_TEMPLATES}`,
        payload,
      ),
    );
  }

  updateTemplate(id: string, payload: Partial<EmailMarketingTemplateDraft>) {
    return firstValueFrom(
      this.http.patch<{ template: EmailMarketingTemplate }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_TEMPLATE(id)}`,
        payload,
      ),
    );
  }

  duplicateTemplate(id: string) {
    return firstValueFrom(
      this.http.post<{ template: EmailMarketingTemplate }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_TEMPLATE_DUPLICATE(id)}`,
        {},
      ),
    );
  }

  previewAudience(
    audience: EmailCampaignAudience,
    registeredRole: string | null,
    audienceFilter: EmailAudienceFilter = {},
  ) {
    return firstValueFrom(
      this.http.post<{ eligible: number; registered: number; promotional: number }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_AUDIENCE_PREVIEW}`,
        { audience, registeredRole, audienceFilter },
      ),
    );
  }

  contacts(
    params: { q?: string; status?: string; page?: number; filter?: EmailAudienceFilter } = {},
  ) {
    const query: Record<string, string> = {};
    if (params.q) query['q'] = params.q;
    if (params.status) query['status'] = params.status;
    if (params.page) query['page'] = String(params.page);
    const filter = params.filter || {};
    const addList = (key: string, values?: string[]) => {
      if (values?.length) query[key] = values.join(',');
    };
    addList('state', filter.states);
    addList('city', filter.cities);
    addList('postalCode', filter.postalCodes);
    addList('sourceLabel', filter.sourceLabels);
    addList('sourceChannel', filter.sourceChannels);
    addList('sourceSegment', filter.sourceSegments);
    addList('paymentMethod', filter.paymentMethods);
    addList('orderStatus', filter.orderStatuses);
    addList('tag', filter.tags);
    if (filter.productQuery) query['product'] = filter.productQuery;
    for (const key of [
      'minOrderCount',
      'maxOrderCount',
      'minTotalOrderValue',
      'maxTotalOrderValue',
      'lastOrderFrom',
      'lastOrderTo',
      'hasMobile',
    ] as const) {
      if (filter[key] !== undefined) query[key] = String(filter[key]);
    }
    return firstValueFrom(
      this.http.get<{
        contacts: EmailMarketingContact[];
        total: number;
        page: number;
        pages: number;
      }>(`${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_CONTACTS}`, { params: query }),
    );
  }

  filterOptions() {
    return firstValueFrom(
      this.http.get<EmailMarketingFilterOptions>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_FILTER_OPTIONS}`,
      ),
    );
  }

  importContacts(payload: {
    contacts: string;
    sourceLabel: string;
    consentBasis: string;
    consentConfirmed: true;
  }) {
    return firstValueFrom(
      this.http.post<{
        found: number;
        imported: number;
        updated: number;
        converted: number;
        suppressed: number;
      }>(`${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_CONTACTS_IMPORT}`, payload),
    );
  }

  previewContactFile(file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return firstValueFrom(
      this.http.post<MarketingSpreadsheetPreview>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_CONTACTS_IMPORT_FILE_PREVIEW}`,
        formData,
      ),
    );
  }

  importContactFile(
    file: File,
    payload: { sourceLabel: string; consentBasis: string; consentConfirmed: true },
  ) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('sourceLabel', payload.sourceLabel);
    formData.append('consentBasis', payload.consentBasis);
    formData.append('consentConfirmed', String(payload.consentConfirmed));
    return firstValueFrom(
      this.http.post<{
        found: number;
        imported: number;
        updated: number;
        converted: number;
        suppressed: number;
        preview: MarketingSpreadsheetPreview;
      }>(`${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_CONTACTS_IMPORT_FILE}`, formData),
    );
  }

  suppressContact(id: string, reason: string) {
    return firstValueFrom(
      this.http.post<{ message: string }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_CONTACT_SUPPRESS(id)}`,
        { reason },
      ),
    );
  }

  campaigns() {
    return firstValueFrom(
      this.http.get<{ campaigns: EmailCampaign[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_CAMPAIGNS}`,
      ),
    );
  }

  deliveries(params: { q?: string; status?: string; campaignId?: string; page?: number } = {}) {
    const query: Record<string, string> = {};
    if (params.q) query['q'] = params.q;
    if (params.status) query['status'] = params.status;
    if (params.campaignId) query['campaignId'] = params.campaignId;
    if (params.page) query['page'] = String(params.page);
    return firstValueFrom(
      this.http.get<{
        deliveries: EmailCampaignDelivery[];
        total: number;
        page: number;
        pages: number;
      }>(`${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_DELIVERIES}`, { params: query }),
    );
  }

  createCampaign(payload: EmailCampaignDraft) {
    return firstValueFrom(
      this.http.post<{ campaign: EmailCampaign }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_CAMPAIGNS}`,
        payload,
      ),
    );
  }

  sendTest(id: string, to: string) {
    return firstValueFrom(
      this.http.post<{ message: string }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_CAMPAIGN_TEST(id)}`,
        { to },
      ),
    );
  }

  launch(id: string) {
    return firstValueFrom(
      this.http.post<{ campaign: EmailCampaign }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_CAMPAIGN_LAUNCH(id)}`,
        { confirmation: 'SEND' },
      ),
    );
  }

  cancel(id: string) {
    return firstValueFrom(
      this.http.post<{ message: string }>(
        `${this.apiBase}${API_PATHS.ADMIN.EMAIL_MARKETING_CAMPAIGN_CANCEL(id)}`,
        {},
      ),
    );
  }
}
