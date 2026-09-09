import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AdminEmailMarketingApi,
  type EmailAudienceFilter,
  type EmailCampaign,
  type EmailCampaignAudience,
  type EmailCampaignDelivery,
  type EmailCampaignDraft,
  type EmailMarketingContact,
  type EmailMarketingFilterOptions,
  type EmailMarketingOverview,
  type MarketingSpreadsheetPreview,
  type EmailMarketingTemplate,
  type EmailMarketingTemplateDraft,
} from '../../core/services/admin/admin-email-marketing.api';

type DraftState = Omit<EmailCampaignDraft, 'complianceConfirmed' | 'scheduledAt'> & {
  scheduledAt: string;
};

const emptyFilter = (): EmailAudienceFilter => ({});
const emptyFilterOptions = (): EmailMarketingFilterOptions => ({
  states: [],
  cities: [],
  postalCodes: [],
  sourceLabels: [],
  sourceChannels: [],
  sourceSegments: [],
  paymentMethods: [],
  orderStatuses: [],
  tags: [],
});

const emptyDraft = (): DraftState => ({
  name: '',
  subject: '',
  previewText: '',
  htmlBody:
    '<h1 style="font-size:28px;margin:0 0 16px">A little support for your week</h1><p style="font-size:16px;line-height:1.7">Write your Hope Hub update here.</p><p><a href="https://hopehub.in" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Visit Hope Hub</a></p>',
  textBody:
    'A little support for your week\n\nWrite your Hope Hub update here.\n\nVisit https://hopehub.in',
  audience: 'REGISTERED_USERS',
  registeredRole: 'PATIENT',
  audienceFilter: emptyFilter(),
  templateId: null,
  scheduledAt: '',
});

const emptyTemplate = (): EmailMarketingTemplateDraft => ({
  name: '',
  category: 'GENERAL',
  description: '',
  subject: '',
  previewText: '',
  htmlBody:
    '<h1 style="font-size:28px;margin:0 0 16px">Email heading</h1><p style="font-size:16px;line-height:1.7">Write your message here.</p><p><a href="https://hopehub.in" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Visit Hope Hub</a></p>',
  textBody: 'Email heading\n\nWrite your message here.\n\nVisit https://hopehub.in',
  isActive: true,
  sortOrder: 100,
});

@Component({
  selector: 'app-email-marketing-page',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './email-marketing-page.html',
  styleUrl: './email-marketing-page.scss',
})
export class EmailMarketingPage implements OnInit {
  private readonly api = inject(AdminEmailMarketingApi);

  readonly tab = signal<'campaigns' | 'templates' | 'contacts' | 'deliveries'>('campaigns');
  readonly overview = signal<EmailMarketingOverview | null>(null);
  readonly campaigns = signal<EmailCampaign[]>([]);
  readonly templates = signal<EmailMarketingTemplate[]>([]);
  readonly templateDraft = signal<EmailMarketingTemplateDraft>(emptyTemplate());
  readonly editingTemplateId = signal('');
  readonly contacts = signal<EmailMarketingContact[]>([]);
  readonly contactsTotal = signal(0);
  readonly contactsPage = signal(1);
  readonly contactsPages = signal(1);
  readonly contactSearch = signal('');
  readonly contactStatus = signal('');
  readonly contactFilter = signal<EmailAudienceFilter>(emptyFilter());
  readonly filterOptions = signal<EmailMarketingFilterOptions>(emptyFilterOptions());
  readonly deliveries = signal<EmailCampaignDelivery[]>([]);
  readonly deliveriesTotal = signal(0);
  readonly deliveriesPage = signal(1);
  readonly deliveriesPages = signal(1);
  readonly deliverySearch = signal('');
  readonly deliveryStatus = signal('');
  readonly deliveryCampaignId = signal('');
  readonly draft = signal<DraftState>(emptyDraft());
  readonly complianceConfirmed = signal(false);
  readonly audiencePreview = signal<{
    eligible: number;
    registered: number;
    promotional: number;
  } | null>(null);
  readonly testEmail = signal('');
  readonly sourceLabel = signal('');
  readonly consentBasis = signal('');
  readonly importText = signal('');
  readonly importFile = signal<File | null>(null);
  readonly spreadsheetPreview = signal<MarketingSpreadsheetPreview | null>(null);
  readonly importConsentConfirmed = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly activeAction = signal('');
  readonly error = signal('');
  readonly success = signal('');

  readonly campaignReady = computed(() => {
    const value = this.draft();
    return Boolean(
      value.name.trim() &&
      value.subject.trim() &&
      value.htmlBody.trim() &&
      value.textBody.trim() &&
      (!value.scheduledAt || this.overview()?.emailConfig.configured !== false) &&
      this.complianceConfirmed(),
    );
  });

  readonly importReady = computed(
    () =>
      Boolean(this.importText().trim() || this.importFile()) &&
      Boolean(this.sourceLabel().trim()) &&
      this.consentBasis().trim().length >= 5 &&
      this.importConsentConfirmed(),
  );

  readonly templateReady = computed(() => {
    const value = this.templateDraft();
    return Boolean(
      value.name.trim() &&
      value.category.trim() &&
      value.subject.trim() &&
      value.htmlBody.trim() &&
      value.textBody.trim(),
    );
  });

  readonly activeTemplates = computed(() => this.templates().filter((item) => item.isActive));

  readonly audienceOptions: Array<{ value: EmailCampaignAudience; label: string }> = [
    { value: 'REGISTERED_USERS', label: 'Registered users' },
    { value: 'PROMOTIONAL_CONTACTS', label: 'Promotional contacts' },
    { value: 'ALL_ELIGIBLE', label: 'All eligible (deduplicated)' },
  ];

  readonly roleOptions = [
    { value: 'PATIENT', label: 'Consumers / patients' },
    { value: 'DOCTOR', label: 'Providers / doctors' },
    { value: 'ADMIN', label: 'Administrators' },
    { value: 'HR', label: 'HR team' },
    { value: 'RECEPTIONIST', label: 'Receptionists' },
    { value: 'CLINIC_MANAGER', label: 'Clinic managers' },
    { value: 'ACCOUNTANT', label: 'Accountants' },
    { value: 'SUPPLIER', label: 'Suppliers' },
    { value: 'WAREHOUSE_MANAGER', label: 'Warehouse managers' },
    { value: 'DELIVERY_EXECUTIVE', label: 'Delivery executives' },
    { value: 'DIAGNOSTIC_PARTNER', label: 'Diagnostic partners' },
    { value: 'BRANCH_OWNER', label: 'Branch owners' },
    { value: 'PATIENT_COORDINATOR', label: 'Patient coordinators' },
    { value: 'CALL_CENTER', label: 'Call centre team' },
    { value: 'MARKETING', label: 'Marketing team' },
    { value: 'CORPORATE_WELLNESS', label: 'Corporate wellness team' },
    { value: 'INSURANCE_PARTNER', label: 'Insurance partners' },
    { value: '', label: 'All account roles (including staff)' },
  ];

  ngOnInit() {
    void this.refresh();
  }

  async refresh() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [overview, campaigns, templates, filterOptions] = await Promise.all([
        this.api.overview(),
        this.api.campaigns(),
        this.api.templates(true),
        this.api.filterOptions(),
      ]);
      this.overview.set(overview);
      this.campaigns.set(campaigns.campaigns || []);
      this.templates.set(templates.templates || []);
      this.filterOptions.set(filterOptions);
      await this.loadContacts();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not load email marketing.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadContacts(page = this.contactsPage()) {
    try {
      const response = await this.api.contacts({
        q: this.contactSearch().trim() || undefined,
        status: this.contactStatus() || undefined,
        filter: this.contactFilter(),
        page,
      });
      this.contacts.set(response.contacts || []);
      this.contactsTotal.set(response.total || 0);
      this.contactsPage.set(response.page || 1);
      this.contactsPages.set(response.pages || 1);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not load contacts.');
    }
  }

  async openDeliveries(campaignId = '') {
    this.tab.set('deliveries');
    this.deliveryCampaignId.set(campaignId);
    await this.loadDeliveries(1);
  }

  async loadDeliveries(page = this.deliveriesPage()) {
    this.error.set('');
    try {
      const response = await this.api.deliveries({
        q: this.deliverySearch().trim() || undefined,
        status: this.deliveryStatus() || undefined,
        campaignId: this.deliveryCampaignId() || undefined,
        page,
      });
      this.deliveries.set(response.deliveries || []);
      this.deliveriesTotal.set(response.total || 0);
      this.deliveriesPage.set(response.page || 1);
      this.deliveriesPages.set(response.pages || 1);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not load delivery history.');
    }
  }

  clearDeliveryCampaign() {
    this.deliveryCampaignId.set('');
    void this.loadDeliveries(1);
  }

  setDraft<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    this.draft.update((current) => ({ ...current, [key]: value }));
    if (key === 'audience' || key === 'registeredRole') this.audiencePreview.set(null);
  }

  setAudienceList(key: keyof EmailAudienceFilter, value: string) {
    this.setFilterList(this.draft().audienceFilter, key, value, (filter) =>
      this.draft.update((current) => ({ ...current, audienceFilter: filter })),
    );
    this.audiencePreview.set(null);
  }

  setAudienceValue(key: keyof EmailAudienceFilter, value: string | boolean | undefined) {
    const filter = this.withFilterValue(this.draft().audienceFilter, key, value);
    this.draft.update((current) => ({ ...current, audienceFilter: filter }));
    this.audiencePreview.set(null);
  }

  setContactList(key: keyof EmailAudienceFilter, value: string) {
    this.setFilterList(this.contactFilter(), key, value, (filter) =>
      this.contactFilter.set(filter),
    );
  }

  setContactValue(key: keyof EmailAudienceFilter, value: string | boolean | undefined) {
    this.contactFilter.set(this.withFilterValue(this.contactFilter(), key, value));
  }

  filterListValue(filter: EmailAudienceFilter, key: keyof EmailAudienceFilter) {
    const value = filter[key];
    return Array.isArray(value) ? value.join(', ') : '';
  }

  filterValue(filter: EmailAudienceFilter, key: keyof EmailAudienceFilter) {
    const value = filter[key];
    return value === undefined || Array.isArray(value) ? '' : String(value);
  }

  filterDateValue(filter: EmailAudienceFilter, key: 'lastOrderFrom' | 'lastOrderTo') {
    return filter[key]?.slice(0, 10) || '';
  }

  setFilterDate(
    target: 'audience' | 'contacts',
    key: 'lastOrderFrom' | 'lastOrderTo',
    value: string,
  ) {
    const iso = value
      ? `${value}${key === 'lastOrderTo' ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
      : undefined;
    if (target === 'audience') this.setAudienceValue(key, iso);
    else this.setContactValue(key, iso);
  }

  resetAudienceFilter() {
    this.draft.update((current) => ({ ...current, audienceFilter: emptyFilter() }));
    this.audiencePreview.set(null);
  }

  resetContactFilter() {
    this.contactFilter.set(emptyFilter());
    void this.loadContacts(1);
  }

  private setFilterList(
    current: EmailAudienceFilter,
    key: keyof EmailAudienceFilter,
    value: string,
    apply: (filter: EmailAudienceFilter) => void,
  ) {
    const values = [
      ...new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
    apply(this.withFilterValue(current, key, values.length ? values : undefined));
  }

  private withFilterValue(
    current: EmailAudienceFilter,
    key: keyof EmailAudienceFilter,
    value: string | string[] | boolean | undefined,
  ) {
    const next = { ...current } as Record<string, unknown>;
    if (value === undefined || value === '') delete next[key];
    else if (
      ['minOrderCount', 'maxOrderCount', 'minTotalOrderValue', 'maxTotalOrderValue'].includes(key)
    ) {
      const number = Number(value);
      if (Number.isFinite(number) && number >= 0) next[key] = number;
      else delete next[key];
    } else next[key] = value;
    return next as EmailAudienceFilter;
  }

  setTemplateDraft<K extends keyof EmailMarketingTemplateDraft>(
    key: K,
    value: EmailMarketingTemplateDraft[K],
  ) {
    this.templateDraft.update((current) => ({ ...current, [key]: value }));
  }

  loadTemplateById(event: Event) {
    const id = this.inputValue(event);
    if (!id) {
      const current = this.draft();
      this.draft.set({
        ...emptyDraft(),
        audience: current.audience,
        registeredRole: current.registeredRole,
        audienceFilter: current.audienceFilter,
        scheduledAt: current.scheduledAt,
      });
      this.success.set('Started a blank campaign.');
      return;
    }
    const template = this.templates().find((item) => item.id === id);
    if (template) this.loadTemplate(template);
  }

  loadTemplate(template: EmailMarketingTemplate) {
    this.draft.update((current) => ({
      ...current,
      templateId: template.id,
      name: template.name,
      subject: template.subject,
      previewText: template.previewText || '',
      htmlBody: template.htmlBody,
      textBody: template.textBody,
    }));
    this.tab.set('campaigns');
    this.success.set(
      `Loaded “${template.name}” from the database. You can edit this campaign copy.`,
    );
  }

  newTemplate() {
    this.editingTemplateId.set('');
    this.templateDraft.set(emptyTemplate());
    this.tab.set('templates');
  }

  editTemplate(template: EmailMarketingTemplate) {
    this.editingTemplateId.set(template.id);
    this.templateDraft.set({
      name: template.name,
      category: template.category,
      description: template.description || '',
      subject: template.subject,
      previewText: template.previewText || '',
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      isActive: template.isActive,
      sortOrder: template.sortOrder,
    });
    this.tab.set('templates');
  }

  async saveTemplate() {
    if (!this.templateReady()) return;
    this.activeAction.set('template-save');
    this.error.set('');
    try {
      const id = this.editingTemplateId();
      const response = id
        ? await this.api.updateTemplate(id, this.templateDraft())
        : await this.api.createTemplate(this.templateDraft());
      this.success.set(`${id ? 'Updated' : 'Created'} template “${response.template.name}”.`);
      this.editingTemplateId.set('');
      this.templateDraft.set(emptyTemplate());
      await this.loadTemplates();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not save template.');
    } finally {
      this.activeAction.set('');
    }
  }

  async duplicateTemplate(template: EmailMarketingTemplate) {
    this.activeAction.set(`template-duplicate:${template.id}`);
    this.error.set('');
    try {
      const response = await this.api.duplicateTemplate(template.id);
      this.success.set(`Created editable copy “${response.template.name}”.`);
      await this.loadTemplates();
      this.editTemplate(response.template);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not duplicate template.');
    } finally {
      this.activeAction.set('');
    }
  }

  async toggleTemplate(template: EmailMarketingTemplate) {
    this.activeAction.set(`template-toggle:${template.id}`);
    this.error.set('');
    try {
      const response = await this.api.updateTemplate(template.id, {
        isActive: !template.isActive,
      });
      this.success.set(
        `${response.template.name} ${response.template.isActive ? 'restored' : 'archived'}.`,
      );
      await this.loadTemplates();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not update template.');
    } finally {
      this.activeAction.set('');
    }
  }

  private async loadTemplates() {
    const response = await this.api.templates(true);
    this.templates.set(response.templates || []);
  }

  inputValue(event: Event) {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }

  checked(event: Event) {
    return (event.target as HTMLInputElement).checked;
  }

  async previewAudience() {
    this.activeAction.set('preview');
    this.error.set('');
    try {
      const value = this.draft();
      this.audiencePreview.set(
        await this.api.previewAudience(
          value.audience,
          value.registeredRole || null,
          value.audienceFilter,
        ),
      );
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not preview audience.');
    } finally {
      this.activeAction.set('');
    }
  }

  async saveCampaign() {
    if (!this.campaignReady()) return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    try {
      const value = this.draft();
      const response = await this.api.createCampaign({
        ...value,
        registeredRole: value.registeredRole || null,
        scheduledAt: value.scheduledAt ? new Date(value.scheduledAt).toISOString() : null,
        complianceConfirmed: true,
      });
      this.campaigns.update((items) => [response.campaign, ...items]);
      this.draft.set(emptyDraft());
      this.complianceConfirmed.set(false);
      this.audiencePreview.set(null);
      this.success.set(
        response.campaign.status === 'SCHEDULED'
          ? 'Campaign scheduled. Recipients will be snapshotted at send time.'
          : 'Draft saved. Send a test, then launch it when ready.',
      );
      await this.reloadOverview();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not save campaign.');
    } finally {
      this.saving.set(false);
    }
  }

  async sendTest(campaign: EmailCampaign) {
    const to = this.testEmail().trim();
    if (!to) {
      this.error.set('Enter a test recipient email first.');
      return;
    }
    this.activeAction.set(`test:${campaign.id}`);
    this.error.set('');
    try {
      const response = await this.api.sendTest(campaign.id, to);
      this.success.set(response.message);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not send test email.');
    } finally {
      this.activeAction.set('');
    }
  }

  async launch(campaign: EmailCampaign) {
    const recipientLabel = campaign.recipientCount
      ? `${campaign.recipientCount} snapshotted recipients`
      : 'the current eligible audience';
    if (
      !confirm(`Queue “${campaign.name}” for ${recipientLabel}? This cannot recall sent email.`)
    ) {
      return;
    }
    this.activeAction.set(`launch:${campaign.id}`);
    this.error.set('');
    try {
      const response = await this.api.launch(campaign.id);
      this.replaceCampaign(response.campaign);
      this.success.set(`Campaign queued for ${response.campaign.recipientCount} recipients.`);
      await this.reloadOverview();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not launch campaign.');
    } finally {
      this.activeAction.set('');
    }
  }

  async cancel(campaign: EmailCampaign) {
    if (!confirm(`Cancel “${campaign.name}”? Already-sent email cannot be recalled.`)) return;
    this.activeAction.set(`cancel:${campaign.id}`);
    try {
      const response = await this.api.cancel(campaign.id);
      this.success.set(response.message);
      await this.refresh();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not cancel campaign.');
    } finally {
      this.activeAction.set('');
    }
  }

  async importContacts() {
    if (!this.importReady()) return;
    this.activeAction.set('import');
    this.error.set('');
    this.success.set('');
    try {
      const file = this.importFile();
      const imported = file
        ? await this.api.importContactFile(file, {
            sourceLabel: this.sourceLabel().trim(),
            consentBasis: this.consentBasis().trim(),
            consentConfirmed: true,
          })
        : await this.api.importContacts({
            contacts: this.importText(),
            sourceLabel: this.sourceLabel().trim(),
            consentBasis: this.consentBasis().trim(),
            consentConfirmed: true,
          });
      this.success.set(
        `Processed ${imported.found}: ${imported.imported} new, ${imported.updated} updated, ${imported.converted} registered, ${imported.suppressed} suppressed.`,
      );
      this.importText.set('');
      this.importFile.set(null);
      this.spreadsheetPreview.set(null);
      this.importConsentConfirmed.set(false);
      await this.refresh();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not import contacts.');
    } finally {
      this.activeAction.set('');
    }
  }

  async loadImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      this.error.set('Choose a .csv or .xlsx file. Save legacy .xls files as .xlsx first.');
      input.value = '';
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      this.error.set('Spreadsheet files must be 25 MB or smaller.');
      input.value = '';
      return;
    }
    this.error.set('');
    this.importFile.set(file);
    this.importText.set('');
    this.spreadsheetPreview.set(null);
    if (!this.sourceLabel().trim()) this.sourceLabel.set(file.name.replace(/\.[^.]+$/, ''));
    this.activeAction.set('file-preview');
    try {
      this.spreadsheetPreview.set(await this.api.previewContactFile(file));
    } catch (error: any) {
      this.importFile.set(null);
      this.error.set(error?.error?.message || error?.message || 'Could not analyze spreadsheet.');
      input.value = '';
    } finally {
      this.activeAction.set('');
    }
  }

  clearImportFile() {
    this.importFile.set(null);
    this.spreadsheetPreview.set(null);
  }

  async suppress(contact: EmailMarketingContact) {
    if (!confirm(`Suppress ${contact.email} from every future promotional campaign?`)) return;
    this.activeAction.set(`suppress:${contact.id}`);
    try {
      const response = await this.api.suppressContact(contact.id, 'Suppressed by administrator');
      this.success.set(response.message);
      await this.refresh();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not suppress contact.');
    } finally {
      this.activeAction.set('');
    }
  }

  sentRate(campaign: EmailCampaign) {
    return campaign.recipientCount
      ? Math.round((campaign.sentCount / campaign.recipientCount) * 100)
      : 0;
  }

  openRate(campaign: EmailCampaign) {
    return campaign.sentCount ? Math.round((campaign.openedCount / campaign.sentCount) * 100) : 0;
  }

  contactLocation(contact: EmailMarketingContact) {
    const cityState = [contact.city, contact.state].filter(Boolean).join(', ');
    return [cityState, contact.postalCode].filter(Boolean).join(' · ') || 'Location unavailable';
  }

  campaignFilterSummary(campaign: EmailCampaign) {
    const filter = campaign.audienceFilter || {};
    const labels: Record<string, string> = {
      states: 'states',
      cities: 'cities',
      postalCodes: 'PINs',
      sourceLabels: 'lists',
      sourceChannels: 'channels',
      sourceSegments: 'segments',
      paymentMethods: 'payment',
      orderStatuses: 'statuses',
      tags: 'tags',
      productQuery: 'product',
      minOrderCount: 'min orders',
      maxOrderCount: 'max orders',
      minTotalOrderValue: 'min spend',
      maxTotalOrderValue: 'max spend',
      lastOrderFrom: 'ordered from',
      lastOrderTo: 'ordered to',
      hasMobile: 'mobile',
    };
    return Object.entries(filter)
      .map(
        ([key, value]) =>
          `${labels[key] || key}: ${Array.isArray(value) ? value.join('/') : value}`,
      )
      .join(' · ');
  }

  private replaceCampaign(campaign: EmailCampaign) {
    this.campaigns.update((items) =>
      items.map((item) => (item.id === campaign.id ? campaign : item)),
    );
  }

  private async reloadOverview() {
    this.overview.set(await this.api.overview());
  }
}
