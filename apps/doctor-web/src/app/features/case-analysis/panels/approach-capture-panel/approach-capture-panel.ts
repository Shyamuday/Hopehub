import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { ApproachFieldDef } from '@vitalis/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';
import { ApproachFieldHintComponent } from '../approach-field-hint/approach-field-hint';

export type ApproachCapturePanelConfig = {
  title: string;
  hint: string;
  fields: ApproachFieldDef[];
};

@Component({
  selector: 'app-approach-capture-panel',
  imports: [FormField, ApproachFieldHintComponent],
  templateUrl: './approach-capture-panel.html',
  styleUrl: './approach-capture-panel.scss'
})
export class ApproachCapturePanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating()
  );

  @Input({ required: true }) config!: ApproachCapturePanelConfig;
  @Input() initial: Record<string, string> | null = null;
  @Input() saving = false;
  @Input() headerExtra = '';

  readonly saveRequested = output<Record<string, string>>();
  readonly autoSaveRequested = output<Record<string, string>>();
  readonly rubricPhraseSelected = output<string>();
  readonly fieldSuggestRequested = output<{ field: ApproachFieldDef; currentValue: string }>();

  readonly model = signal<Record<string, string>>({});
  readonly form = form(this.model);

  ngOnChanges() {
    this.hydrating.set(true);
    const next: Record<string, string> = {};
    for (const field of this.config.fields) {
      next[field.key] = this.initial?.[field.key]?.trim() || '';
    }
    this.model.set(next);
    this.autoSave.resetSnapshot(next);
    this.hydrating.set(false);
  }

  save() {
    this.autoSave.resetSnapshot(this.model());
    this.saveRequested.emit(this.model());
  }

  searchRubricsFromField(field: ApproachFieldDef) {
    const phrase = this.model()[field.key]?.trim();
    if (!phrase) return;
    this.rubricPhraseSelected.emit(phrase);
  }

  suggestField(field: ApproachFieldDef) {
    this.fieldSuggestRequested.emit({
      field,
      currentValue: this.model()[field.key] || ''
    });
  }

  isMultiline(field: ApproachFieldDef) {
    if (field.fieldType === 'text' || field.fieldType === 'select') return false;
    return field.multiline !== false;
  }
}
