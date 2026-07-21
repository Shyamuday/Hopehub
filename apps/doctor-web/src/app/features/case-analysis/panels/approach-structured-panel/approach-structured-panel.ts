import { Component, Input, OnChanges, output, signal, type SimpleChanges } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  COMBINATION_REMEDY_CATALOG,
  fieldOptionGroupsForField,
  type ApproachStructuredPanelDef,
  type CombinationRemedy,
  type ApproachFieldDef,
  type ApproachStructuredPanelSectionDef,
  type StructuredPanelLayer,
} from '@hopehub/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';
import { ApproachFieldHintComponent } from '../approach-field-hint/approach-field-hint';

@Component({
  selector: 'app-approach-structured-panel',
  imports: [FormField, ApproachFieldHintComponent],
  templateUrl: './approach-structured-panel.html',
  styleUrl: './approach-structured-panel.scss',
})
export class ApproachStructuredPanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating(),
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
  readonly activeSectionIndex = signal(0);
  readonly activeLayer = signal<StructuredPanelLayer>('capture');
  readonly layers: Array<{ key: StructuredPanelLayer; label: string }> = [
    { key: 'capture', label: 'Capture' },
    { key: 'clarify', label: 'Clarify' },
    { key: 'extract', label: 'Extract' },
  ];

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['config'] && !changes['initial']) return;

    this.hydrating.set(true);
    const next: Record<string, string> = {};
    for (const field of this.config.fields) {
      next[field.key] = this.initial?.[field.key]?.trim() || '';
    }
    this.model.set(next);
    this.autoSave.resetSnapshot(next);
    this.activeSectionIndex.set(0);
    this.activeLayer.set('capture');
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
      currentValue: this.model()[field.key] || '',
    });
  }

  addFieldOption(field: ApproachFieldDef, option: string) {
    const current = this.model()[field.key]?.trim();
    if (this.hasFieldOption(field, option)) {
      this.removeFieldOption(field, option);
      return;
    }
    this.model.update((model) => ({
      ...model,
      [field.key]: current ? `${current}; ${option}` : option,
    }));
  }

  removeFieldOption(field: ApproachFieldDef, option: string) {
    const next = (this.model()[field.key] || '')
      .split(';')
      .map((item) => item.trim())
      .filter((item) => item && item.toLowerCase() !== option.toLowerCase())
      .join('; ');
    this.model.update((model) => ({ ...model, [field.key]: next }));
  }

  hasFieldOption(field: ApproachFieldDef, option: string) {
    return (this.model()[field.key] || '')
      .split(';')
      .map((item) => item.trim().toLowerCase())
      .includes(option.toLowerCase());
  }

  optionGroups(field: ApproachFieldDef) {
    return fieldOptionGroupsForField(field);
  }

  isMultiline(field: ApproachFieldDef) {
    if (field.fieldType === 'text' || field.fieldType === 'select') return false;
    return field.multiline !== false;
  }

  hasGuidedSections() {
    return !!this.config.sections?.length;
  }

  sections() {
    return this.config.sections || [];
  }

  currentSection(): ApproachStructuredPanelSectionDef | null {
    return this.sections()[this.activeSectionIndex()] || null;
  }

  currentFields() {
    const section = this.currentSection();
    if (!section) return [];
    const keys = new Set(section.fieldKeys);
    const activeLayer = this.activeLayer();
    return this.config.fields.filter(
      (field) => keys.has(field.key) && (field.captureLayer || 'capture') === activeLayer,
    );
  }

  sectionFields(section: ApproachStructuredPanelSectionDef) {
    const keys = new Set(section.fieldKeys);
    return this.config.fields.filter((field) => keys.has(field.key));
  }

  sectionCompletion(section: ApproachStructuredPanelSectionDef) {
    const fields = this.sectionFields(section);
    if (!fields.length) return 0;
    const done = fields.filter((field) => this.model()[field.key]?.trim()).length;
    return Math.round((done / fields.length) * 100);
  }

  overallCompletion() {
    if (!this.config.fields.length) return 0;
    const done = this.config.fields.filter((field) => this.model()[field.key]?.trim()).length;
    return Math.round((done / this.config.fields.length) * 100);
  }

  setSection(index: number) {
    if (index < 0 || index >= this.sections().length) return;
    this.activeSectionIndex.set(index);
    this.activeLayer.set('capture');
  }

  setLayer(layer: StructuredPanelLayer) {
    this.activeLayer.set(layer);
  }

  previous() {
    const layerIndex = this.layers.findIndex((layer) => layer.key === this.activeLayer());
    if (layerIndex > 0) {
      this.activeLayer.set(this.layers[layerIndex - 1].key);
      return;
    }
    if (this.activeSectionIndex() > 0) {
      this.activeSectionIndex.update((index) => index - 1);
      this.activeLayer.set('extract');
    }
  }

  next() {
    const layerIndex = this.layers.findIndex((layer) => layer.key === this.activeLayer());
    if (layerIndex < this.layers.length - 1) {
      this.activeLayer.set(this.layers[layerIndex + 1].key);
      return;
    }
    if (this.activeSectionIndex() < this.sections().length - 1) {
      this.activeSectionIndex.update((index) => index + 1);
      this.activeLayer.set('capture');
    }
  }

  isFirstGuidedStep() {
    return this.activeSectionIndex() === 0 && this.activeLayer() === 'capture';
  }

  isLastGuidedStep() {
    return (
      this.activeSectionIndex() === this.sections().length - 1 && this.activeLayer() === 'extract'
    );
  }

  layerHint(section: ApproachStructuredPanelSectionDef) {
    return section.layerHints?.[this.activeLayer()] || section.description;
  }

  selectCombination(combination: CombinationRemedy) {
    this.model.update((current) => ({
      ...current,
      combinationName: combination.name,
      componentRemedies: combination.componentRemedies,
      indicationMatch: combination.indications,
      personalizationNotes: combination.notes,
    }));
    this.autoSave.resetSnapshot(this.model());
  }
}
