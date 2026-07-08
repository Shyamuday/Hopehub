import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  COMBINATION_REMEDY_CATALOG,
  type ApproachStructuredPanelDef,
  type CombinationRemedy,
  type ApproachFieldDef
} from '@vitalis/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';
import { ApproachFieldHintComponent } from '../approach-field-hint/approach-field-hint';

@Component({
  selector: 'app-approach-structured-panel',
  imports: [FormField, ApproachFieldHintComponent],
  templateUrl: './approach-structured-panel.html',
  styleUrl: './approach-structured-panel.scss'
})
export class ApproachStructuredPanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating()
  );

  readonly combinationCatalog = COMBINATION_REMEDY_CATALOG;

  @Input({ required: true }) config!: ApproachStructuredPanelDef;
  @Input() initial: Record<string, string> | null = null;
  @Input() saving = false;

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

  selectCombination(combination: CombinationRemedy) {
    this.model.update((current) => ({
      ...current,
      combinationName: combination.name,
      componentRemedies: combination.componentRemedies,
      indicationMatch: combination.indications,
      personalizationNotes: combination.notes
    }));
    this.autoSave.resetSnapshot(this.model());
  }
}
