import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';

const TIP_TYPES = [
  'SLEEP',
  'NUTRITION',
  'EXERCISE',
  'SOCIAL',
  'WORK_LIFE_BALANCE',
  'ENVIRONMENT',
  'HABITS',
  'SELF_CARE',
  'DIGITAL_BOUNDARIES',
  'AYURVEDA_LIFESTYLE',
] as const;

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

type TipForm = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  type: string;
  difficulty: string;
  timeToImplement: string;
  concernSlugsText: string;
  categoriesText: string;
  benefitsText: string;
  stepsJson: string;
  tipsText: string;
  scientificBasis: string;
  commonMistakesText: string;
  progressTrackingText: string;
  relatedTipSlugsText: string;
  contraindicationsText: string;
  avoidIfText: string;
  tagsText: string;
  youtubeUrl: string;
  telegramUrl: string;
  expertReviewed: boolean;
  safetyLevel: string;
  status: string;
  sortOrder: number;
  metadataJson: string;
};

type RuleForm = {
  id: string;
  assessmentType: string;
  concernSlug: string;
  minScore: number | null;
  maxScore: number | null;
  priority: number;
  routineSlot: string;
  isActive: boolean;
  notes: string;
};

@Component({
  selector: 'app-lifestyle-tips-admin-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="admin-page">
      <section class="page-head">
        <div>
          <p>Catalog</p>
          <h1>Lifestyle tips</h1>
        </div>
        <button type="button" (click)="newDraft()">New tip</button>
      </section>

      <section class="filters">
        <input
          type="search"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)"
          placeholder="Search tips"
        />
        <select [ngModel]="status()" (ngModelChange)="status.set($event); load()">
          <option value="">All statuses</option>
          @for (statusOption of statuses; track statusOption) {
            <option [value]="statusOption">{{ statusOption }}</option>
          }
        </select>
        <button type="button" (click)="load()" [disabled]="loading()">Refresh</button>
      </section>

      @if (toast()) {
        <p class="toast">{{ toast() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <section class="editor">
        <div class="panel">
          <h2>Tip details</h2>
          <div class="grid">
            <label
              >Title <input [ngModel]="form().title" (ngModelChange)="patchForm({ title: $event })"
            /></label>
            <label
              >Slug <input [ngModel]="form().slug" (ngModelChange)="patchForm({ slug: $event })"
            /></label>
            <label
              >Type
              <select [ngModel]="form().type" (ngModelChange)="patchForm({ type: $event })">
                @for (type of types; track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </label>
            <label
              >Difficulty
              <select
                [ngModel]="form().difficulty"
                (ngModelChange)="patchForm({ difficulty: $event })"
              >
                <option value="EASY">EASY</option>
                <option value="MODERATE">MODERATE</option>
                <option value="CHALLENGING">CHALLENGING</option>
              </select>
            </label>
            <label
              >Status
              <select [ngModel]="form().status" (ngModelChange)="patchForm({ status: $event })">
                @for (statusOption of statuses; track statusOption) {
                  <option [value]="statusOption">{{ statusOption }}</option>
                }
              </select>
            </label>
            <label
              >Time
              <input
                [ngModel]="form().timeToImplement"
                (ngModelChange)="patchForm({ timeToImplement: $event })"
            /></label>
          </div>
          <label
            >Short description
            <textarea
              rows="2"
              [ngModel]="form().shortDescription"
              (ngModelChange)="patchForm({ shortDescription: $event })"
            ></textarea>
          </label>
          <label
            >Description
            <textarea
              rows="4"
              [ngModel]="form().description"
              (ngModelChange)="patchForm({ description: $event })"
            ></textarea>
          </label>
          <div class="grid">
            <label
              >Concerns
              <input
                [ngModel]="form().concernSlugsText"
                (ngModelChange)="patchForm({ concernSlugsText: $event })"
            /></label>
            <label
              >Categories
              <input
                [ngModel]="form().categoriesText"
                (ngModelChange)="patchForm({ categoriesText: $event })"
            /></label>
            <label
              >Tags
              <input [ngModel]="form().tagsText" (ngModelChange)="patchForm({ tagsText: $event })"
            /></label>
            <label
              >Safety
              <input
                [ngModel]="form().safetyLevel"
                (ngModelChange)="patchForm({ safetyLevel: $event })"
            /></label>
          </div>
          <label
            >Benefits
            <textarea
              rows="3"
              [ngModel]="form().benefitsText"
              (ngModelChange)="patchForm({ benefitsText: $event })"
            ></textarea>
          </label>
          <label
            >Steps JSON
            <textarea
              rows="8"
              class="mono"
              [ngModel]="form().stepsJson"
              (ngModelChange)="patchForm({ stepsJson: $event })"
            ></textarea>
          </label>
          <label
            >Tips
            <textarea
              rows="3"
              [ngModel]="form().tipsText"
              (ngModelChange)="patchForm({ tipsText: $event })"
            ></textarea>
          </label>
          <label
            >Scientific basis
            <textarea
              rows="3"
              [ngModel]="form().scientificBasis"
              (ngModelChange)="patchForm({ scientificBasis: $event })"
            ></textarea>
          </label>
          <div class="grid">
            <label
              >Common mistakes
              <textarea
                rows="3"
                [ngModel]="form().commonMistakesText"
                (ngModelChange)="patchForm({ commonMistakesText: $event })"
              ></textarea>
            </label>
            <label
              >Progress tracking
              <textarea
                rows="3"
                [ngModel]="form().progressTrackingText"
                (ngModelChange)="patchForm({ progressTrackingText: $event })"
              ></textarea>
            </label>
            <label
              >Contraindications
              <textarea
                rows="3"
                [ngModel]="form().contraindicationsText"
                (ngModelChange)="patchForm({ contraindicationsText: $event })"
              ></textarea>
            </label>
            <label
              >Avoid if
              <textarea
                rows="3"
                [ngModel]="form().avoidIfText"
                (ngModelChange)="patchForm({ avoidIfText: $event })"
              ></textarea>
            </label>
          </div>
          <div class="grid">
            <label
              >YouTube URL
              <input
                [ngModel]="form().youtubeUrl"
                (ngModelChange)="patchForm({ youtubeUrl: $event })"
            /></label>
            <label
              >Telegram URL
              <input
                [ngModel]="form().telegramUrl"
                (ngModelChange)="patchForm({ telegramUrl: $event })"
            /></label>
          </div>
          <label class="check"
            ><input
              type="checkbox"
              [ngModel]="form().expertReviewed"
              (ngModelChange)="patchForm({ expertReviewed: $event })"
            />
            Expert reviewed</label
          >
          <label
            >Metadata JSON
            <textarea
              rows="4"
              class="mono"
              [ngModel]="form().metadataJson"
              (ngModelChange)="patchForm({ metadataJson: $event })"
            ></textarea>
          </label>
          <div class="actions">
            <button type="button" (click)="save()" [disabled]="saving()">Save tip</button>
            @if (form().id) {
              <button type="button" class="ghost" (click)="archive()" [disabled]="saving()">
                Archive
              </button>
            }
          </div>
        </div>

        <div class="panel">
          <h2>Recommendation rule</h2>
          <label
            >Assessment
            <input
              [ngModel]="ruleForm().assessmentType"
              (ngModelChange)="patchRule({ assessmentType: $event })"
              placeholder="gad7"
          /></label>
          <label
            >Concern
            <input
              [ngModel]="ruleForm().concernSlug"
              (ngModelChange)="patchRule({ concernSlug: $event })"
              placeholder="anxiety"
          /></label>
          <div class="grid">
            <label
              >Min
              <input
                type="number"
                [ngModel]="ruleForm().minScore"
                (ngModelChange)="patchRule({ minScore: numberOrNull($event) })"
            /></label>
            <label
              >Max
              <input
                type="number"
                [ngModel]="ruleForm().maxScore"
                (ngModelChange)="patchRule({ maxScore: numberOrNull($event) })"
            /></label>
            <label
              >Priority
              <input
                type="number"
                [ngModel]="ruleForm().priority"
                (ngModelChange)="patchRule({ priority: numberValue($event, 3) })"
            /></label>
            <label
              >Slot
              <input
                [ngModel]="ruleForm().routineSlot"
                (ngModelChange)="patchRule({ routineSlot: $event })"
            /></label>
          </div>
          <label
            >Notes
            <textarea
              rows="3"
              [ngModel]="ruleForm().notes"
              (ngModelChange)="patchRule({ notes: $event })"
            ></textarea>
          </label>
          <label class="check"
            ><input
              type="checkbox"
              [ngModel]="ruleForm().isActive"
              (ngModelChange)="patchRule({ isActive: $event })"
            />
            Active</label
          >
          <button type="button" (click)="saveRule()" [disabled]="saving() || !form().id">
            Save rule
          </button>
        </div>
      </section>

      <section class="list">
        @for (tip of tips(); track tip.id) {
          <article class="row" (click)="edit(tip)">
            <div>
              <strong>{{ tip.title }}</strong
              ><span>{{ tip.slug }} · {{ tip.type }} · {{ tip.status }}</span
              ><small>{{ tip.shortDescription }}</small>
            </div>
            <div class="rule-count">{{ tip.recommendationRules?.length || 0 }} rules</div>
          </article>
        } @empty {
          <p class="empty">No lifestyle tips found.</p>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .admin-page,
      .panel {
        display: grid;
        gap: 1rem;
      }
      .page-head,
      .filters,
      .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .page-head p,
      .page-head h1,
      .panel h2 {
        margin: 0;
      }
      .page-head p {
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 800;
        text-transform: uppercase;
      }
      .page-head h1 {
        color: #0f172a;
        font-size: 1.8rem;
      }
      .editor {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(18rem, 1fr);
        gap: 1rem;
        align-items: start;
      }
      .panel,
      .row {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
        padding: 1rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
        color: #334155;
        font-size: 0.86rem;
        font-weight: 700;
      }
      input,
      select,
      textarea,
      button {
        border: 1px solid #dbe3ea;
        border-radius: 8px;
        padding: 0.65rem 0.8rem;
        background: #fff;
        font: inherit;
      }
      button {
        background: var(--brand-primary, #256f5f);
        color: #fff;
        font-weight: 800;
        cursor: pointer;
      }
      .ghost {
        background: #fff;
        color: #334155;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 0.82rem;
      }
      .check {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .check input {
        width: auto;
      }
      .list {
        display: grid;
        gap: 0.75rem;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        cursor: pointer;
      }
      .row strong,
      .row span,
      .row small {
        display: block;
      }
      .row span,
      .row small,
      .empty {
        color: #64748b;
      }
      .rule-count,
      .toast {
        color: #166534;
        font-weight: 800;
      }
      .error {
        color: #b91c1c;
        font-weight: 700;
      }
      @media (max-width: 900px) {
        .editor,
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class LifestyleTipsAdminPage implements OnInit {
  private readonly api = inject(AdminApi);
  readonly tips = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly query = signal('');
  readonly status = signal('');
  readonly toast = signal('');
  readonly error = signal('');
  readonly form = signal<TipForm>(this.emptyForm());
  readonly ruleForm = signal<RuleForm>(this.emptyRule());
  readonly types = TIP_TYPES;
  readonly statuses = STATUSES;

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.api.getLifestyleTipsAdmin({
        q: this.query(),
        status: this.status(),
      });
      this.tips.set(response.tips || []);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not load lifestyle tips.');
    } finally {
      this.loading.set(false);
    }
  }

  edit(tip: any): void {
    this.form.set({
      ...this.emptyForm(),
      id: tip.id,
      slug: tip.slug,
      title: tip.title,
      shortDescription: tip.shortDescription,
      description: tip.description,
      type: tip.type,
      difficulty: tip.difficulty,
      timeToImplement: tip.timeToImplement,
      concernSlugsText: this.joinList(tip.concernSlugs),
      categoriesText: this.joinList(tip.categories),
      benefitsText: this.joinList(tip.benefits),
      stepsJson: JSON.stringify(tip.steps || [], null, 2),
      tipsText: this.joinList(tip.tips),
      scientificBasis: tip.scientificBasis || '',
      commonMistakesText: this.joinList(tip.commonMistakes),
      progressTrackingText: this.joinList(tip.progressTracking),
      relatedTipSlugsText: this.joinList(tip.relatedTipSlugs),
      contraindicationsText: this.joinList(tip.contraindications),
      avoidIfText: this.joinList(tip.avoidIf),
      tagsText: this.joinList(tip.tags),
      youtubeUrl: tip.youtubeUrl || '',
      telegramUrl: tip.telegramUrl || '',
      expertReviewed: Boolean(tip.expertReviewed),
      safetyLevel: tip.safetyLevel || 'LOW',
      status: tip.status || 'DRAFT',
      sortOrder: tip.sortOrder || 0,
      metadataJson: JSON.stringify(tip.metadata || {}, null, 2),
    });
    const rule = tip.recommendationRules?.[0];
    this.ruleForm.set(
      rule
        ? {
            id: rule.id,
            assessmentType: rule.assessmentType || '',
            concernSlug: rule.concernSlug || '',
            minScore: rule.minScore,
            maxScore: rule.maxScore,
            priority: rule.priority || 3,
            routineSlot: rule.routineSlot || '',
            isActive: Boolean(rule.isActive),
            notes: rule.notes || '',
          }
        : this.emptyRule(),
    );
  }

  newDraft(): void {
    this.form.set(this.emptyForm());
    this.ruleForm.set(this.emptyRule());
  }
  patchForm(patch: Partial<TipForm>): void {
    this.form.update((current) => ({ ...current, ...patch }));
  }
  patchRule(patch: Partial<RuleForm>): void {
    this.ruleForm.update((current) => ({ ...current, ...patch }));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const current = this.form();
      const payload = this.payloadFromForm(current);
      if (current.id) await this.api.updateLifestyleTip(current.id, payload);
      else {
        const response = await this.api.createLifestyleTip(payload);
        this.form.update((form) => ({ ...form, id: response.tip.id }));
      }
      this.toast.set('Lifestyle tip saved.');
      await this.load();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not save lifestyle tip.');
    } finally {
      this.saving.set(false);
    }
  }

  async archive(): Promise<void> {
    if (!this.form().id || !confirm('Archive this lifestyle tip?')) return;
    await this.api.archiveLifestyleTip(this.form().id);
    this.newDraft();
    await this.load();
  }

  async saveRule(): Promise<void> {
    if (!this.form().id) return;
    const current = this.ruleForm();
    const payload = {
      lifestyleTipId: this.form().id,
      assessmentType: current.assessmentType || null,
      concernSlug: current.concernSlug || null,
      minScore: current.minScore,
      maxScore: current.maxScore,
      priority: current.priority,
      routineSlot: current.routineSlot || null,
      isActive: current.isActive,
      notes: current.notes || null,
    };
    if (current.id) await this.api.updateLifestyleTipRule(current.id, payload);
    else {
      const response = await this.api.createLifestyleTipRule(payload);
      this.ruleForm.update((rule) => ({ ...rule, id: response.rule.id }));
    }
    this.toast.set('Recommendation rule saved.');
    await this.load();
  }

  numberOrNull(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  numberValue(value: unknown, fallback: number): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }
  private splitList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  private joinList(value: string[] | null | undefined): string {
    return (value || []).join(', ');
  }
  private payloadFromForm(form: TipForm): Record<string, unknown> {
    return {
      slug: form.slug,
      title: form.title,
      shortDescription: form.shortDescription,
      description: form.description,
      type: form.type,
      difficulty: form.difficulty,
      timeToImplement: form.timeToImplement,
      concernSlugs: this.splitList(form.concernSlugsText),
      categories: this.splitList(form.categoriesText),
      benefits: this.splitList(form.benefitsText),
      steps: JSON.parse(form.stepsJson || '[]'),
      tips: this.splitList(form.tipsText),
      scientificBasis: form.scientificBasis || null,
      commonMistakes: this.splitList(form.commonMistakesText),
      progressTracking: this.splitList(form.progressTrackingText),
      relatedTipSlugs: this.splitList(form.relatedTipSlugsText),
      contraindications: this.splitList(form.contraindicationsText),
      avoidIf: this.splitList(form.avoidIfText),
      tags: this.splitList(form.tagsText),
      youtubeUrl: form.youtubeUrl || null,
      telegramUrl: form.telegramUrl || null,
      expertReviewed: form.expertReviewed,
      safetyLevel: form.safetyLevel,
      status: form.status,
      sortOrder: Number(form.sortOrder || 0),
      metadata: JSON.parse(form.metadataJson || '{}'),
    };
  }
  private emptyForm(): TipForm {
    return {
      id: '',
      slug: '',
      title: '',
      shortDescription: '',
      description: '',
      type: 'SELF_CARE',
      difficulty: 'EASY',
      timeToImplement: '10 minutes',
      concernSlugsText: '',
      categoriesText: '',
      benefitsText: '',
      stepsJson: JSON.stringify([{ stepNumber: 1, action: '' }], null, 2),
      tipsText: '',
      scientificBasis: '',
      commonMistakesText: '',
      progressTrackingText: '',
      relatedTipSlugsText: '',
      contraindicationsText: '',
      avoidIfText: '',
      tagsText: '',
      youtubeUrl: '',
      telegramUrl: '',
      expertReviewed: false,
      safetyLevel: 'LOW',
      status: 'DRAFT',
      sortOrder: 0,
      metadataJson: JSON.stringify({ disclaimer: 'Lifestyle support only.' }, null, 2),
    };
  }
  private emptyRule(): RuleForm {
    return {
      id: '',
      assessmentType: '',
      concernSlug: '',
      minScore: null,
      maxScore: null,
      priority: 3,
      routineSlot: '',
      isActive: true,
      notes: '',
    };
  }
}
