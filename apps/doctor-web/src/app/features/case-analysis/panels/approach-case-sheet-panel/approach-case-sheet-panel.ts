import { Component, Input, output } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import type { ApproachFieldDef } from '@vitalis/homeopathy-approaches';
import { ApproachFieldHintComponent } from '../approach-field-hint/approach-field-hint';

@Component({
  selector: 'app-approach-case-sheet-panel',
  imports: [FormField, ApproachFieldHintComponent],
  templateUrl: './approach-case-sheet-panel.html',
  styleUrl: './approach-case-sheet-panel.scss'
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

  searchRubricsFromField(field: ApproachFieldDef) {
    const phrase = this.caseSheetValues[field.key]?.trim();
    if (!phrase) return;
    this.rubricPhraseSelected.emit(phrase);
  }

  suggestField(field: ApproachFieldDef) {
    this.fieldSuggestRequested.emit({
      field,
      currentValue: this.caseSheetValues[field.key] || ''
    });
  }

  isMultiline(field: ApproachFieldDef) {
    if (field.fieldType === 'text' || field.fieldType === 'select') return false;
    return field.multiline !== false;
  }
}
