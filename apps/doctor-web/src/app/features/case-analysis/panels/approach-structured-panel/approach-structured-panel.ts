import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  COMBINATION_REMEDY_CATALOG,
  type ApproachStructuredPanelDef,
  type CombinationRemedy
} from '@vitalis/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';

@Component({
  selector: 'app-approach-structured-panel',
  imports: [FormField],
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

  searchRubricsFromField(fieldKey: string) {
    const phrase = this.model()[fieldKey]?.trim();
    if (!phrase) return;
    this.rubricPhraseSelected.emit(phrase);
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
