import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { AdminApi } from '../../../core/services/admin-api';
import { AdminCanDirective } from '../../../core/directives/admin-can.directive';
import { ADMIN_PERMISSIONS } from '../../../core/admin-permissions';
import { AppUnsavedChangesBarComponent } from '../../../shared/ui/app-unsaved-changes-bar.component';
import type { CarePricingTemplateDto, ProviderRoleDefinitionDto } from '@hopehub/contracts';

const REQUIRED_SITE_CONFIG_KEYS = new Set([
  'whatsappGroupUrl',
  'telegramUsername',
  'telegramUserBotUsername',
  'telegramDoctorBotUsername',
  'telegramQrCodePath',
  'whatsappQrCodePath',
  'telegramDefaultOfferingSlug',
]);

type ConfigEntry = {
  key: string;
  value: string;
  label: string;
  description: string;
  source: 'default' | 'custom';
};
type PricingMode = CarePricingTemplateDto['pricingMode'];
type CarePricingTemplate = Omit<CarePricingTemplateDto, 'id'> & { id?: string };

function emptyTemplate(): CarePricingTemplate {
  return {
    applicableRoleCodes: [],
    title: '',
    description: '',
    pricingMode: 'FIXED',
    priceInPaise: 50000,
    firstSessionPriceInPaise: null,
    followUpPriceInPaise: null,
    introSessionLimit: 1,
    packageSessionCount: null,
    packagePriceInPaise: null,
    freeMinutes: 5,
    pricePerMinuteInPaise: null,
    durationMinutes: 30,
    isFree: false,
    isActive: true,
    sortOrder: 100,
  };
}

const MULTILINE_KEYS = new Set([
  'clinicAddressLine1',
  'clinicAddressLine2',
  'clinicAddressLine3',
  'clinicAddressLine4',
  'homeHeroLead',
]);

@Component({
  selector: 'app-site-config-page',
  imports: [CommonModule, AdminCanDirective, AppUnsavedChangesBarComponent],
  templateUrl: './site-config-page.html',
  styleUrl: './site-config-page.scss',
})
export class SiteConfigPage {
  readonly managePermissions = [
    ADMIN_PERMISSIONS.CATALOG_WRITE,
    ADMIN_PERMISSIONS.HR_WRITE,
  ] as const;
  readonly config = signal<ConfigEntry[]>([]);
  readonly loading = signal(false);
  readonly saving = signal<string | null>(null);
  readonly error = signal('');
  readonly message = signal('');

  readonly localValues = signal<Record<string, string>>({});
  readonly hasUnsavedConfigChanges = computed(() =>
    this.config().some((entry) => (this.localValues()[entry.key] ?? '') !== entry.value),
  );
  readonly templates = signal<CarePricingTemplate[]>([]);
  readonly providerRoles = signal<ProviderRoleDefinitionDto[]>([]);
  readonly templateDraft = signal<CarePricingTemplate>(emptyTemplate());
  readonly savingTemplate = signal<string | null>(null);
  readonly pricingModeOptions: Array<{ value: PricingMode; label: string }> = [
    { value: 'FIXED', label: 'Fixed price' },
    { value: 'FREE_INTRO', label: 'First session free' },
    { value: 'DISCOUNTED_FIRST', label: 'Discounted first session' },
    { value: 'PACKAGE', label: 'Package' },
    { value: 'FREE_VOLUNTEER', label: 'Free emotional support listener support' },
    { value: 'PER_MINUTE', label: 'Per-minute pricing' },
  ];

  constructor(private readonly api: AdminApi) {
    void this.load();
    void this.loadTemplates();
    void this.loadProviderRoles();
  }

  isMultiline(key: string) {
    return MULTILINE_KEYS.has(key);
  }

  sectionLabel(key: string) {
    if (key.startsWith('googleAds')) return 'Advertising & measurement';
    if (key.startsWith('homeHero')) return 'Homepage hero';
    if (key.startsWith('clinicAddress') || key.startsWith('contact')) return 'Footer & contact';
    if (
      key.startsWith('stat') ||
      key === 'whatsappPhone' ||
      key === 'clinicName' ||
      key === 'doctorListLimit'
    ) {
      return key.startsWith('statPatients') ||
        key.startsWith('statConditions') ||
        key.startsWith('statImprovement') ||
        key === 'statSatisfaction'
        ? 'Testimonials stats'
        : key.startsWith('stat')
          ? 'Homepage stats'
          : 'Branding';
    }
    return 'General';
  }

  async load() {
    this.loading.set(true);
    try {
      const res = await this.api.getSiteConfig();
      this.config.set(res.config);
      const map: Record<string, string> = {};
      res.config.forEach((c) => {
        map[c.key] = c.value;
      });
      this.localValues.set(map);
    } catch {
      this.error.set('Could not load settings.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadTemplates() {
    try {
      const res = await this.api.listAdminCarePricingTemplates();
      this.templates.set(
        res.templates.map((template) => ({
          ...template,
          applicableRoleCodes: template.applicableRoleCodes ?? [],
        })),
      );
    } catch {
      this.error.set('Could not load care pricing templates.');
    }
  }

  async loadProviderRoles() {
    try {
      const response = await this.api.listProviderRoles();
      this.providerRoles.set(response.roles);
    } catch {
      this.error.set('Could not load provider roles for pricing templates.');
    }
  }

  toggleTemplateRole(
    template: CarePricingTemplate,
    roleCode: string,
    checked: boolean,
    index?: number,
  ) {
    const applicableRoleCodes = checked
      ? Array.from(new Set([...template.applicableRoleCodes, roleCode]))
      : template.applicableRoleCodes.filter((code) => code !== roleCode);
    if (index == null) {
      this.templateDraft.update((draft) => ({ ...draft, applicableRoleCodes }));
      return;
    }
    this.templates.update((templates) =>
      templates.map((item, itemIndex) =>
        itemIndex === index ? { ...item, applicableRoleCodes } : item,
      ),
    );
  }

  updateLocal(key: string, value: string) {
    this.localValues.update((m) => ({ ...m, [key]: value }));
  }

  isRequired(key: string) {
    return REQUIRED_SITE_CONFIG_KEYS.has(key);
  }

  discardConfigChanges() {
    this.localValues.set(
      Object.fromEntries(this.config().map((entry) => [entry.key, entry.value])),
    );
    this.error.set('');
    this.message.set('Unsaved site-setting changes discarded.');
  }

  async saveAllConfigChanges() {
    const changes = this.config().filter(
      (entry) => (this.localValues()[entry.key] ?? '') !== entry.value,
    );
    if (!changes.length) return;

    const requiredBlank = changes.find(
      (entry) => this.isRequired(entry.key) && !(this.localValues()[entry.key] ?? '').trim(),
    );
    if (requiredBlank) {
      this.error.set(`${requiredBlank.label} is required and cannot be cleared.`);
      return;
    }

    const clearing = changes.filter((entry) => !(this.localValues()[entry.key] ?? '').trim());
    if (
      clearing.length &&
      !window.confirm(
        `Clear ${clearing.length} optional site setting${clearing.length === 1 ? '' : 's'}?`,
      )
    ) {
      return;
    }

    this.saving.set('__all__');
    this.error.set('');
    this.message.set('');
    try {
      await this.api.setSiteConfigBulk(
        changes.map((entry) => ({
          key: entry.key,
          value: (this.localValues()[entry.key] ?? '').trim(),
        })),
      );
      this.message.set(`${changes.length} site setting${changes.length === 1 ? '' : 's'} saved.`);
      await this.load();
    } catch (error: any) {
      this.error.set(
        error?.error?.message ||
          'Could not save all site settings. No unsaved values were cleared.',
      );
    } finally {
      this.saving.set(null);
    }
  }

  async save(key: string) {
    const value = (this.localValues()[key] ?? '').trim();
    if (!value && this.isRequired(key)) {
      this.error.set(
        `${this.config().find((entry) => entry.key === key)?.label || key} is required and cannot be cleared.`,
      );
      return;
    }
    if (
      !value &&
      !window.confirm(
        `Clear ${this.config().find((entry) => entry.key === key)?.label || key} from the public site?`,
      )
    ) {
      return;
    }
    this.saving.set(key);
    this.message.set('');
    this.error.set('');
    try {
      await this.api.setSiteConfig(key, value);
      this.message.set(value ? `"${key}" saved.` : `"${key}" cleared.`);
      await this.load();
    } catch (error: any) {
      this.error.set(error?.error?.message || `Could not save "${key}".`);
    } finally {
      this.saving.set(null);
    }
  }

  async restoreDefault(key: string) {
    this.saving.set(key);
    this.message.set('');
    try {
      await this.api.restoreSiteConfigDefault(key);
      this.message.set(`"${key}" restored to the system default.`);
      await this.load();
    } catch {
      this.error.set(`Could not restore "${key}".`);
    } finally {
      this.saving.set(null);
    }
  }

  updateDraft(key: keyof CarePricingTemplate, value: string | boolean) {
    this.templateDraft.update((draft) => this.patchTemplate(draft, key, value));
  }

  updateTemplate(index: number, key: keyof CarePricingTemplate, value: string | boolean) {
    this.templates.update((templates) =>
      templates.map((template, i) =>
        i === index ? this.patchTemplate(template, key, value) : template,
      ),
    );
  }

  async createTemplate() {
    const draft = this.templateDraft();
    if (!draft.title.trim()) return;
    this.savingTemplate.set('new');
    this.message.set('');
    try {
      await this.api.createCarePricingTemplate(this.cleanTemplate(draft));
      this.templateDraft.set(emptyTemplate());
      this.message.set('Care pricing template created.');
      await this.loadTemplates();
    } catch {
      this.error.set('Could not create care pricing template.');
    } finally {
      this.savingTemplate.set(null);
    }
  }

  async saveTemplate(template: CarePricingTemplate) {
    if (!template.id || !template.title.trim()) return;
    this.savingTemplate.set(template.id);
    this.message.set('');
    try {
      await this.api.updateCarePricingTemplate(template.id, this.cleanTemplate(template));
      this.message.set('Care pricing template saved.');
      await this.loadTemplates();
    } catch {
      this.error.set('Could not save care pricing template.');
    } finally {
      this.savingTemplate.set(null);
    }
  }

  async deactivateTemplate(template: CarePricingTemplate) {
    if (!template.id) return;
    this.savingTemplate.set(template.id);
    this.message.set('');
    try {
      await this.api.deactivateCarePricingTemplate(template.id);
      this.message.set('Care pricing template deactivated.');
      await this.loadTemplates();
    } catch {
      this.error.set('Could not deactivate care pricing template.');
    } finally {
      this.savingTemplate.set(null);
    }
  }

  rupees(value: number | null | undefined) {
    return value == null ? '' : String(value / 100);
  }

  showFirstPrice(template: CarePricingTemplate) {
    return template.pricingMode === 'DISCOUNTED_FIRST';
  }

  showFollowUpPrice(template: CarePricingTemplate) {
    return template.pricingMode === 'FREE_INTRO' || template.pricingMode === 'DISCOUNTED_FIRST';
  }

  showPackageFields(template: CarePricingTemplate) {
    return template.pricingMode === 'PACKAGE';
  }

  showPerMinuteFields(template: CarePricingTemplate) {
    return template.pricingMode === 'PER_MINUTE';
  }

  private patchTemplate(
    template: CarePricingTemplate,
    key: keyof CarePricingTemplate,
    value: string | boolean,
  ): CarePricingTemplate {
    const next = { ...template };
    if (
      key === 'priceInPaise' ||
      key === 'firstSessionPriceInPaise' ||
      key === 'followUpPriceInPaise' ||
      key === 'packagePriceInPaise' ||
      key === 'pricePerMinuteInPaise'
    ) {
      (next as any)[key] = value === '' ? null : Math.max(0, Math.round(Number(value) * 100));
    } else if (
      key === 'introSessionLimit' ||
      key === 'packageSessionCount' ||
      key === 'freeMinutes' ||
      key === 'durationMinutes' ||
      key === 'sortOrder'
    ) {
      (next as any)[key] = value === '' ? null : Math.max(0, Math.round(Number(value)));
    } else {
      (next as any)[key] = value;
    }
    if (key === 'pricingMode') {
      next.isFree = value === 'FREE_VOLUNTEER';
      if (value === 'FREE_VOLUNTEER' || value === 'PER_MINUTE') next.priceInPaise = 0;
    }
    return next;
  }

  private cleanTemplate(template: CarePricingTemplate) {
    return {
      applicableRoleCodes: [...template.applicableRoleCodes],
      title: template.title.trim(),
      description: template.description?.trim() || null,
      pricingMode: template.pricingMode,
      priceInPaise:
        template.pricingMode === 'FREE_VOLUNTEER' || template.pricingMode === 'PER_MINUTE'
          ? 0
          : template.priceInPaise || 0,
      firstSessionPriceInPaise: template.firstSessionPriceInPaise ?? null,
      followUpPriceInPaise: template.followUpPriceInPaise ?? null,
      introSessionLimit: template.introSessionLimit || 1,
      packageSessionCount: template.packageSessionCount ?? null,
      packagePriceInPaise: template.packagePriceInPaise ?? null,
      freeMinutes: template.freeMinutes || 0,
      pricePerMinuteInPaise: template.pricePerMinuteInPaise ?? null,
      durationMinutes: template.durationMinutes || 30,
      isFree: template.isFree || template.pricingMode === 'FREE_VOLUNTEER',
      isActive: template.isActive !== false,
      sortOrder: template.sortOrder || 0,
    };
  }
}
