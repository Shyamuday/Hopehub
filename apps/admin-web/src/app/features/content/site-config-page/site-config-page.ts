import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AdminApi } from '../../../core/services/admin-api';

type ConfigEntry = { key: string; value: string; label: string; description: string };
type PricingMode = 'FIXED' | 'FREE_INTRO' | 'DISCOUNTED_FIRST' | 'PACKAGE' | 'FREE_VOLUNTEER';
type CarePricingTemplate = {
  id?: string;
  title: string;
  description?: string | null;
  pricingMode: PricingMode;
  priceInPaise: number;
  firstSessionPriceInPaise?: number | null;
  followUpPriceInPaise?: number | null;
  introSessionLimit: number;
  packageSessionCount?: number | null;
  packagePriceInPaise?: number | null;
  durationMinutes: number;
  isFree: boolean;
  isActive: boolean;
  sortOrder: number;
};

function emptyTemplate(): CarePricingTemplate {
  return {
    title: '',
    description: '',
    pricingMode: 'FIXED',
    priceInPaise: 50000,
    firstSessionPriceInPaise: null,
    followUpPriceInPaise: null,
    introSessionLimit: 1,
    packageSessionCount: null,
    packagePriceInPaise: null,
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
  imports: [CommonModule],
  templateUrl: './site-config-page.html',
  styleUrl: './site-config-page.scss',
})
export class SiteConfigPage {
  readonly config = signal<ConfigEntry[]>([]);
  readonly loading = signal(false);
  readonly saving = signal<string | null>(null);
  readonly error = signal('');
  readonly message = signal('');

  readonly localValues = signal<Record<string, string>>({});
  readonly templates = signal<CarePricingTemplate[]>([]);
  readonly templateDraft = signal<CarePricingTemplate>(emptyTemplate());
  readonly savingTemplate = signal<string | null>(null);
  readonly pricingModeOptions: Array<{ value: PricingMode; label: string }> = [
    { value: 'FIXED', label: 'Fixed price' },
    { value: 'FREE_INTRO', label: 'First session free' },
    { value: 'DISCOUNTED_FIRST', label: 'Discounted first session' },
    { value: 'PACKAGE', label: 'Package' },
    { value: 'FREE_VOLUNTEER', label: 'Free volunteer support' },
  ];

  constructor(private readonly api: AdminApi) {
    void this.load();
    void this.loadTemplates();
  }

  isMultiline(key: string) {
    return MULTILINE_KEYS.has(key);
  }

  sectionLabel(key: string) {
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
      this.templates.set(res.templates);
    } catch {
      this.error.set('Could not load care pricing templates.');
    }
  }

  updateLocal(key: string, value: string) {
    this.localValues.update((m) => ({ ...m, [key]: value }));
  }

  async save(key: string) {
    const value = this.localValues()[key];
    if (!value?.trim()) return;
    this.saving.set(key);
    this.message.set('');
    try {
      await this.api.setSiteConfig(key, value.trim());
      this.message.set(`"${key}" saved.`);
      await this.load();
    } catch {
      this.error.set(`Could not save "${key}".`);
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
      key === 'packagePriceInPaise'
    ) {
      (next as any)[key] = value === '' ? null : Math.max(0, Math.round(Number(value) * 100));
    } else if (
      key === 'introSessionLimit' ||
      key === 'packageSessionCount' ||
      key === 'durationMinutes' ||
      key === 'sortOrder'
    ) {
      (next as any)[key] = value === '' ? null : Math.max(0, Math.round(Number(value)));
    } else {
      (next as any)[key] = value;
    }
    if (key === 'pricingMode') next.isFree = value === 'FREE_VOLUNTEER';
    return next;
  }

  private cleanTemplate(template: CarePricingTemplate) {
    return {
      title: template.title.trim(),
      description: template.description?.trim() || null,
      pricingMode: template.pricingMode,
      priceInPaise: template.pricingMode === 'FREE_VOLUNTEER' ? 0 : template.priceInPaise || 0,
      firstSessionPriceInPaise: template.firstSessionPriceInPaise ?? null,
      followUpPriceInPaise: template.followUpPriceInPaise ?? null,
      introSessionLimit: template.introSessionLimit || 1,
      packageSessionCount: template.packageSessionCount ?? null,
      packagePriceInPaise: template.packagePriceInPaise ?? null,
      durationMinutes: template.durationMinutes || 30,
      isFree: template.isFree || template.pricingMode === 'FREE_VOLUNTEER',
      isActive: template.isActive !== false,
      sortOrder: template.sortOrder || 0,
    };
  }
}
