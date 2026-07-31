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
  readonly saving = signal(false);
  readonly toast = signal('');
  readonly error = signal('');
  readonly query = signal('');
  readonly definitions = signal<any[]>([]);
  readonly form = signal<DefinitionForm>(this.emptyForm());

  ngOnInit(): void {
    void this.load();
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

  edit(definition: any): void {
    this.form.set({
      id: definition.id,
      type: definition.type,
      category: definition.category,
      title: definition.title,
      description: definition.description,
      version: definition.version || 'v1',
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
      sortOrder: 0,
      isActive: false,
      configJson: JSON.stringify(config, null, 2),
    };
  }
}
