import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';

const PRACTICE_TYPES = [
  'BREATHING',
  'MINDFULNESS',
  'PHYSICAL',
  'COGNITIVE',
  'RELAXATION',
  'GROUNDING',
  'JOURNALING',
  'VISUALIZATION',
  'YOGA',
  'PRANAYAMA',
  'MEDITATION',
  'SOMATIC',
  'MOBILITY',
  'AYURVEDA_LIFESTYLE',
  'SPIRITUAL_GROUNDING',
] as const;

const PRACTICE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

type PracticeForm = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  type: string;
  difficulty: string;
  durationMinutes: number | null;
  durationLabel: string;
  concernSlugsText: string;
  categoriesText: string;
  benefitsText: string;
  stepsJson: string;
  tipsText: string;
  whenToUseText: string;
  contraindicationsText: string;
  avoidIfText: string;
  tagsText: string;
  mediaUrl: string;
  audioUrl: string;
  videoUrl: string;
  youtubeUrl: string;
  telegramUrl: string;
  thumbnailUrl: string;
  sourceSystem: string;
  expertReviewed: boolean;
  safetyLevel: string;
  status: string;
  sortOrder: number;
  metadataJson: string;
};

type RuleForm = {
  id: string;
  practiceId: string;
  assessmentType: string;
  concernSlug: string;
  minScore: number | null;
  maxScore: number | null;
  level: string;
  priority: number;
  routineSlot: string;
  isActive: boolean;
  notes: string;
};

@Component({
  selector: 'app-practices-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="admin-page">
      <section class="page-head">
        <div>
          <p>Catalog</p>
          <h1>Practices</h1>
        </div>
        <button type="button" (click)="newDraft()">New practice</button>
      </section>

      <section class="filters">
        <input
          type="search"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)"
          placeholder="Search title, slug, tag"
        />
        <select [ngModel]="status()" (ngModelChange)="status.set($event); load()">
          <option value="">All statuses</option>
          @for (option of statuses; track option) {
            <option [value]="option">{{ option }}</option>
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
          <h2>Practice details</h2>
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
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
              </select>
            </label>
            <label
              >Status
              <select [ngModel]="form().status" (ngModelChange)="patchForm({ status: $event })">
                @for (option of statuses; track option) {
                  <option [value]="option">{{ option }}</option>
                }
              </select>
            </label>
            <label
              >Safety level
              <input
                [ngModel]="form().safetyLevel"
                (ngModelChange)="patchForm({ safetyLevel: $event })"
            /></label>
            <label
              >Minutes
              <input
                type="number"
                [ngModel]="form().durationMinutes"
                (ngModelChange)="patchForm({ durationMinutes: numberOrNull($event) })"
            /></label>
            <label
              >Duration label
              <input
                [ngModel]="form().durationLabel"
                (ngModelChange)="patchForm({ durationLabel: $event })"
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
                placeholder="anxiety, breakup"
            /></label>
            <label
              >Categories
              <input
                [ngModel]="form().categoriesText"
                (ngModelChange)="patchForm({ categoriesText: $event })"
                placeholder="Anxiety, Sleep"
            /></label>
            <label
              >Tags
              <input [ngModel]="form().tagsText" (ngModelChange)="patchForm({ tagsText: $event })"
            /></label>
            <label
              >Source system
              <input
                [ngModel]="form().sourceSystem"
                (ngModelChange)="patchForm({ sourceSystem: $event })"
                placeholder="yoga, ayurveda-inspired"
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
            >When to use
            <textarea
              rows="3"
              [ngModel]="form().whenToUseText"
              (ngModelChange)="patchForm({ whenToUseText: $event })"
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

          <div class="grid">
            <label
              >Media URL
              <input [ngModel]="form().mediaUrl" (ngModelChange)="patchForm({ mediaUrl: $event })"
            /></label>
            <label
              >Audio URL
              <input [ngModel]="form().audioUrl" (ngModelChange)="patchForm({ audioUrl: $event })"
            /></label>
            <label
              >Video URL
              <input [ngModel]="form().videoUrl" (ngModelChange)="patchForm({ videoUrl: $event })"
            /></label>
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
            <label
              >Thumbnail URL
              <input
                [ngModel]="form().thumbnailUrl"
                (ngModelChange)="patchForm({ thumbnailUrl: $event })"
            /></label>
          </div>

          <label class="check">
            <input
              type="checkbox"
              [ngModel]="form().expertReviewed"
              (ngModelChange)="patchForm({ expertReviewed: $event })"
            />
            Expert reviewed
          </label>
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
            <button type="button" (click)="save()" [disabled]="saving()">Save practice</button>
            @if (form().id) {
              <button type="button" class="ghost" (click)="archive()" [disabled]="saving()">
                Archive
              </button>
            }
          </div>
        </div>

        <div class="panel">
          <h2>Recommendation rule</h2>
          <div class="grid">
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
            <label
              >Min score
              <input
                type="number"
                [ngModel]="ruleForm().minScore"
                (ngModelChange)="patchRule({ minScore: numberOrNull($event) })"
            /></label>
            <label
              >Max score
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
              >Routine slot
              <input
                [ngModel]="ruleForm().routineSlot"
                (ngModelChange)="patchRule({ routineSlot: $event })"
                placeholder="morning/evening/calm-now"
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
          <label class="check">
            <input
              type="checkbox"
              [ngModel]="ruleForm().isActive"
              (ngModelChange)="patchRule({ isActive: $event })"
            />
            Active rule
          </label>
          <button type="button" (click)="saveRule()" [disabled]="saving() || !form().id">
            Save rule
          </button>
        </div>
      </section>

      <section class="list">
        @for (practice of practices(); track practice.id) {
          <article class="row" (click)="edit(practice)">
            <div>
              <strong>{{ practice.title }}</strong>
              <span>{{ practice.slug }} · {{ practice.type }} · {{ practice.status }}</span>
              <small>{{ practice.shortDescription }}</small>
            </div>
            <div class="rule-count">{{ practice.recommendationRules?.length || 0 }} rules</div>
          </article>
        } @empty {
          <p class="empty">No practices found.</p>
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
      textarea {
        resize: vertical;
      }
      button {
        background: var(--brand-primary, #256f5f);
        color: #fff;
        font-weight: 800;
        cursor: pointer;
      }
      button.ghost {
        background: #fff;
        color: #334155;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
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
      .row:hover {
        border-color: var(--brand-primary, #256f5f);
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
      .rule-count {
        color: #0f766e;
        font-weight: 800;
        white-space: nowrap;
      }
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
export class PracticesPage implements OnInit {
  private readonly api = inject(AdminApi);
  readonly practices = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly query = signal('');
  readonly status = signal('');
  readonly toast = signal('');
  readonly error = signal('');
  readonly form = signal<PracticeForm>(this.emptyForm());
  readonly ruleForm = signal<RuleForm>(this.emptyRule());
  readonly types = PRACTICE_TYPES;
  readonly statuses = PRACTICE_STATUSES;

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.getPracticesAdmin({
        q: this.query(),
        status: this.status(),
      });
      this.practices.set(response.practices || []);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not load practices.');
    } finally {
      this.loading.set(false);
    }
  }

  edit(practice: any): void {
    this.form.set({
      ...this.emptyForm(),
      id: practice.id,
      slug: practice.slug,
      title: practice.title,
      shortDescription: practice.shortDescription,
      description: practice.description,
      type: practice.type,
      difficulty: practice.difficulty,
      durationMinutes: practice.durationMinutes,
      durationLabel: practice.durationLabel || '',
      concernSlugsText: this.joinList(practice.concernSlugs),
      categoriesText: this.joinList(practice.categories),
      benefitsText: this.joinList(practice.benefits),
      stepsJson: JSON.stringify(practice.steps || [], null, 2),
      tipsText: this.joinList(practice.tips),
      whenToUseText: this.joinList(practice.whenToUse),
      contraindicationsText: this.joinList(practice.contraindications),
      avoidIfText: this.joinList(practice.avoidIf),
      tagsText: this.joinList(practice.tags),
      mediaUrl: practice.mediaUrl || '',
      audioUrl: practice.audioUrl || '',
      videoUrl: practice.videoUrl || '',
      youtubeUrl: practice.youtubeUrl || '',
      telegramUrl: practice.telegramUrl || '',
      thumbnailUrl: practice.thumbnailUrl || '',
      sourceSystem: practice.sourceSystem || '',
      expertReviewed: Boolean(practice.expertReviewed),
      safetyLevel: practice.safetyLevel || 'LOW',
      status: practice.status || 'DRAFT',
      sortOrder: practice.sortOrder || 0,
      metadataJson: JSON.stringify(practice.metadata || {}, null, 2),
    });
    const firstRule = practice.recommendationRules?.[0];
    this.ruleForm.set(
      firstRule ? this.ruleFromExisting(firstRule, practice.id) : this.emptyRule(practice.id),
    );
  }

  newDraft(): void {
    this.form.set(this.emptyForm());
    this.ruleForm.set(this.emptyRule());
  }

  patchForm(patch: Partial<PracticeForm>): void {
    this.form.update((current) => ({ ...current, ...patch }));
  }

  patchRule(patch: Partial<RuleForm>): void {
    this.ruleForm.update((current) => ({ ...current, ...patch }));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      const current = this.form();
      const payload = this.payloadFromForm(current);
      if (current.id) {
        await this.api.updatePractice(current.id, payload);
        this.toast.set('Practice updated.');
      } else {
        const response = await this.api.createPractice(payload);
        this.form.update((form) => ({ ...form, id: response.practice.id }));
        this.ruleForm.update((rule) => ({ ...rule, practiceId: response.practice.id }));
        this.toast.set('Practice created.');
      }
      await this.load();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not save practice.');
    } finally {
      this.saving.set(false);
    }
  }

  async archive(): Promise<void> {
    if (!this.form().id || !confirm('Archive this practice?')) return;
    this.saving.set(true);
    try {
      await this.api.archivePractice(this.form().id);
      this.toast.set('Practice archived.');
      this.newDraft();
      await this.load();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not archive practice.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveRule(): Promise<void> {
    if (!this.form().id) return;
    this.saving.set(true);
    try {
      const current = { ...this.ruleForm(), practiceId: this.form().id };
      const payload = {
        practiceId: current.practiceId,
        assessmentType: current.assessmentType || null,
        concernSlug: current.concernSlug || null,
        minScore: current.minScore,
        maxScore: current.maxScore,
        level: current.level || null,
        priority: current.priority,
        routineSlot: current.routineSlot || null,
        isActive: current.isActive,
        notes: current.notes || null,
      };
      if (current.id) {
        await this.api.updatePracticeRule(current.id, payload);
      } else {
        const response = await this.api.createPracticeRule(payload);
        this.ruleForm.update((rule) => ({ ...rule, id: response.rule.id }));
      }
      this.toast.set('Recommendation rule saved.');
      await this.load();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not save rule.');
    } finally {
      this.saving.set(false);
    }
  }

  numberOrNull(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  numberValue(value: unknown, fallback: number): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  private payloadFromForm(form: PracticeForm): Record<string, unknown> {
    return {
      slug: form.slug,
      title: form.title,
      shortDescription: form.shortDescription,
      description: form.description,
      type: form.type,
      difficulty: form.difficulty,
      durationMinutes: form.durationMinutes,
      durationLabel: form.durationLabel || null,
      concernSlugs: this.splitList(form.concernSlugsText),
      categories: this.splitList(form.categoriesText),
      benefits: this.splitList(form.benefitsText),
      steps: JSON.parse(form.stepsJson || '[]'),
      tips: this.splitList(form.tipsText),
      whenToUse: this.splitList(form.whenToUseText),
      contraindications: this.splitList(form.contraindicationsText),
      avoidIf: this.splitList(form.avoidIfText),
      tags: this.splitList(form.tagsText),
      mediaUrl: form.mediaUrl || null,
      audioUrl: form.audioUrl || null,
      videoUrl: form.videoUrl || null,
      youtubeUrl: form.youtubeUrl || null,
      telegramUrl: form.telegramUrl || null,
      thumbnailUrl: form.thumbnailUrl || null,
      sourceSystem: form.sourceSystem || null,
      expertReviewed: form.expertReviewed,
      safetyLevel: form.safetyLevel,
      status: form.status,
      sortOrder: Number(form.sortOrder || 0),
      metadata: JSON.parse(form.metadataJson || '{}'),
    };
  }

  private emptyForm(): PracticeForm {
    return {
      id: '',
      slug: '',
      title: '',
      shortDescription: '',
      description: '',
      type: 'YOGA',
      difficulty: 'BEGINNER',
      durationMinutes: 10,
      durationLabel: '10 minutes',
      concernSlugsText: '',
      categoriesText: '',
      benefitsText: '',
      stepsJson: JSON.stringify([{ stepNumber: 1, instruction: '' }], null, 2),
      tipsText: '',
      whenToUseText: '',
      contraindicationsText: '',
      avoidIfText: '',
      tagsText: '',
      mediaUrl: '',
      audioUrl: '',
      videoUrl: '',
      youtubeUrl: '',
      telegramUrl: '',
      thumbnailUrl: '',
      sourceSystem: '',
      expertReviewed: false,
      safetyLevel: 'LOW',
      status: 'DRAFT',
      sortOrder: 0,
      metadataJson: JSON.stringify({ disclaimer: 'Supportive practice only.' }, null, 2),
    };
  }

  private emptyRule(practiceId = ''): RuleForm {
    return {
      id: '',
      practiceId,
      assessmentType: '',
      concernSlug: '',
      minScore: null,
      maxScore: null,
      level: '',
      priority: 3,
      routineSlot: '',
      isActive: true,
      notes: '',
    };
  }

  private ruleFromExisting(rule: any, practiceId: string): RuleForm {
    return {
      id: rule.id,
      practiceId,
      assessmentType: rule.assessmentType || '',
      concernSlug: rule.concernSlug || '',
      minScore: rule.minScore,
      maxScore: rule.maxScore,
      level: rule.level || '',
      priority: rule.priority || 3,
      routineSlot: rule.routineSlot || '',
      isActive: Boolean(rule.isActive),
      notes: rule.notes || '',
    };
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
}
