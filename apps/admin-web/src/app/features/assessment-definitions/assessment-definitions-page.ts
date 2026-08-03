import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';

type DefinitionForm = {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  version: string;
  accessMode: 'FREE' | 'LOGIN_REQUIRED' | 'PAID';
  priceRupees: number | null;
  couponCode: string;
  couponLabel: string;
  couponDiscountType: 'FREE' | 'PERCENT' | 'FLAT';
  couponDiscountValue: number | null;
  couponStartsAt: string;
  couponEndsAt: string;
  couponMaxRedemptions: number | null;
  accessNote: string;
  sortOrder: number;
  isActive: boolean;
  configJson: string;
};

@Component({
  selector: 'app-assessment-definitions-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './assessment-definitions-page.html',
  styleUrl: './assessment-definitions-page.scss',
})
export class AssessmentDefinitionsPage implements OnInit {
  private readonly api = inject(AdminApi);

  readonly loading = signal(true);
  readonly reportLoading = signal(true);
  readonly saving = signal(false);
  readonly toast = signal('');
  readonly error = signal('');
  readonly query = signal('');
  readonly reportQuery = signal('');
  readonly reportStatus = signal('');
  readonly definitions = signal<any[]>([]);
  readonly accessReport = signal<any>({
    payments: [],
    redemptions: [],
    couponUsage: [],
    summary: {},
    pagination: {},
  });
  readonly form = signal<DefinitionForm>(this.emptyForm());

  ngOnInit(): void {
    void this.load();
    void this.loadAccessReport();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.getAssessmentDefinitionsAdmin({
        includeInactive: true,
        q: this.query(),
      });
      this.definitions.set(response.definitions || []);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not load assessments.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadAccessReport(): Promise<void> {
    this.reportLoading.set(true);
    this.error.set('');
    try {
      const response = await this.api.getAssessmentAccessReport({
        q: this.reportQuery(),
        status: this.reportStatus(),
      });
      this.accessReport.set(response);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not load access report.');
    } finally {
      this.reportLoading.set(false);
    }
  }

  rupees(value: number | null | undefined): string {
    return `₹${Math.round(Number(value || 0) / 100)}`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  edit(definition: any): void {
    this.form.set({
      id: definition.id,
      type: definition.type,
      category: definition.category,
      title: definition.title,
      description: definition.description,
      version: definition.version || 'v1',
      accessMode: definition.accessMode || 'FREE',
      priceRupees:
        definition.priceInPaise === null || definition.priceInPaise === undefined
          ? null
          : Math.round(Number(definition.priceInPaise) / 100),
      couponCode: definition.couponCode || '',
      couponLabel: definition.couponLabel || '',
      couponDiscountType: definition.couponDiscountType || 'FREE',
      couponDiscountValue:
        definition.couponDiscountType === 'FLAT' && definition.couponDiscountValue != null
          ? Math.round(Number(definition.couponDiscountValue) / 100)
          : (definition.couponDiscountValue ?? null),
      couponStartsAt: this.toDateTimeInput(definition.couponStartsAt),
      couponEndsAt: this.toDateTimeInput(definition.couponEndsAt),
      couponMaxRedemptions: definition.couponMaxRedemptions ?? null,
      accessNote: definition.accessNote || '',
      sortOrder: definition.sortOrder || 0,
      isActive: Boolean(definition.isActive),
      configJson: JSON.stringify(definition.config, null, 2),
    });
  }

  newDraft(): void {
    this.form.set(this.emptyForm());
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      const current = this.form();
      const config = JSON.parse(current.configJson);
      const id = current.id || config.id;
      const payload = {
        type: current.type || config.type,
        category: current.category || config.category,
        title: current.title || config.title,
        description: current.description || config.description,
        version: current.version,
        accessMode: current.accessMode,
        priceInPaise:
          current.priceRupees === null || current.priceRupees === undefined
            ? null
            : Math.max(0, Math.round(Number(current.priceRupees) * 100)),
        couponCode: current.couponCode.trim() || null,
        couponLabel: current.couponLabel.trim() || null,
        couponDiscountType: current.couponDiscountType,
        couponDiscountValue:
          current.couponDiscountValue === null || current.couponDiscountValue === undefined
            ? null
            : current.couponDiscountType === 'FLAT'
              ? Math.max(0, Math.round(Number(current.couponDiscountValue) * 100))
              : Number(current.couponDiscountValue),
        couponStartsAt: current.couponStartsAt
          ? new Date(current.couponStartsAt).toISOString()
          : null,
        couponEndsAt: current.couponEndsAt ? new Date(current.couponEndsAt).toISOString() : null,
        couponMaxRedemptions:
          current.couponMaxRedemptions === null || current.couponMaxRedemptions === undefined
            ? null
            : Number(current.couponMaxRedemptions),
        accessNote: current.accessNote.trim() || null,
        sortOrder: Number(current.sortOrder || 0),
        isActive: current.isActive,
        config,
      };

      if (this.definitions().some((definition) => definition.id === id)) {
        await this.api.updateAssessmentDefinition(id, payload);
      } else {
        await this.api.createAssessmentDefinition({ id, ...payload });
      }

      this.toast.set('Assessment saved.');
      await this.load();
    } catch (error: any) {
      this.error.set(
        error?.error?.errors?.join(' ') ||
          error?.error?.message ||
          error?.message ||
          'Could not save assessment.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  async publish(definition: any): Promise<void> {
    await this.togglePublish(definition.id, true);
  }

  async unpublish(definition: any): Promise<void> {
    await this.togglePublish(definition.id, false);
  }

  private async togglePublish(id: string, active: boolean): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      if (active) {
        await this.api.publishAssessmentDefinition(id);
        this.toast.set('Assessment published.');
      } else {
        await this.api.unpublishAssessmentDefinition(id);
        this.toast.set('Assessment unpublished.');
      }
      await this.load();
    } catch (error: any) {
      this.error.set(
        error?.error?.errors?.join(' ') ||
          error?.error?.message ||
          error?.message ||
          'Could not update publish status.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private emptyForm(): DefinitionForm {
    const config = {
      id: '',
      type: '',
      category: '',
      title: '',
      description: '',
      instructions: '',
      duration: '3-5 minutes',
      questions: [{ id: 1, text: '' }],
      responseOptions: [
        { value: 0, label: 'Not at all' },
        { value: 1, label: 'Several days' },
        { value: 2, label: 'More than half the days' },
        { value: 3, label: 'Nearly every day' },
      ],
      scoring: [
        {
          min: 0,
          max: 3,
          level: 'Low',
          color: 'green',
          description: '',
          suggestions: [],
        },
      ],
      disclaimer:
        'This self-check is for education and self-reflection only. It is not a diagnosis.',
      emergencyHelplines: [],
    };
    return {
      id: '',
      type: '',
      category: '',
      title: '',
      description: '',
      version: 'v1',
      accessMode: 'FREE',
      priceRupees: null,
      couponCode: '',
      couponLabel: '',
      couponDiscountType: 'FREE',
      couponDiscountValue: null,
      couponStartsAt: '',
      couponEndsAt: '',
      couponMaxRedemptions: null,
      accessNote: '',
      sortOrder: 0,
      isActive: false,
      configJson: JSON.stringify(config, null, 2),
    };
  }

  private toDateTimeInput(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  }
}
