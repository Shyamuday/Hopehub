import { Component, Input, output } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { fieldOptionGroupsForField, type ApproachFieldDef } from '@hopehub/homeopathy-approaches';
import { ApproachFieldHintComponent } from '../approach-field-hint/approach-field-hint';

@Component({
  selector: 'app-approach-case-sheet-panel',
  imports: [FormField, ApproachFieldHintComponent],
  templateUrl: './approach-case-sheet-panel.html',
  styleUrl: './approach-case-sheet-panel.scss',
})
export class ApproachCaseSheetPanelComponent {
  @Input({ required: true }) fields: ApproachFieldDef[] = [];
  @Input({ required: true }) title = 'Case sheet';
  @Input() description = 'Document the case using the structure required by the selected approach.';
  @Input() saving = false;
  @Input({ required: true }) caseSheetForm!: object;
  @Input({ required: true }) caseSheetValues: Record<string, string> = {};

  readonly saveRequested = output<void>();
  readonly rubricPhraseSelected = output<string>();
  readonly fieldSuggestRequested = output<{ field: ApproachFieldDef; currentValue: string }>();
  readonly fieldOptionToggled = output<{ field: ApproachFieldDef; option: string }>();

  searchRubricsFromField(field: ApproachFieldDef) {
    const phrase = this.caseSheetValues[field.key]?.trim();
    if (!phrase) return;
    this.rubricPhraseSelected.emit(phrase);
  }

  suggestField(field: ApproachFieldDef) {
    this.fieldSuggestRequested.emit({
      field,
      currentValue: this.caseSheetValues[field.key] || '',
    });
  }

  addFieldOption(field: ApproachFieldDef, option: string) {
    this.fieldOptionToggled.emit({ field, option });
  }

  hasFieldOption(field: ApproachFieldDef, option: string) {
    return (this.caseSheetValues[field.key] || '')
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
}
