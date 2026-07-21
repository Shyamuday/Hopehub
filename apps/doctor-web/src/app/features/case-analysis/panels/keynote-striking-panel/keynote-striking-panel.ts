import { Component, Input, output } from '@angular/core';
import { specializedPanelDef, type KeynoteApproachData } from '@hopehub/homeopathy-approaches';
import { ApproachCapturePanelComponent } from '../approach-capture-panel/approach-capture-panel';

@Component({
  selector: 'app-keynote-striking-panel',
  imports: [ApproachCapturePanelComponent],
  template: `
    @if (panelConfig; as config) {
      <app-approach-capture-panel
        [config]="config"
        [initial]="initialRecord"
        [saving]="saving"
        (saveRequested)="onSave($event)"
        (autoSaveRequested)="onAutoSave($event)"
        (rubricPhraseSelected)="rubricPhraseSelected.emit($event)"
        (fieldSuggestRequested)="fieldSuggestRequested.emit($event)"
      />
    }
  `
})
export class KeynoteStrikingPanelComponent {
  readonly panelConfig = specializedPanelDef('keynote-striking');

  @Input() initial: KeynoteApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<KeynoteApproachData>();
  readonly autoSaveRequested = output<KeynoteApproachData>();
  readonly rubricPhraseSelected = output<string>();
  readonly fieldSuggestRequested = output<{ field: import('@hopehub/homeopathy-approaches').ApproachFieldDef; currentValue: string }>();

  get initialRecord() {
    return (this.initial || null) as Record<string, string> | null;
  }

  onSave(value: Record<string, string>) {
    this.saveRequested.emit(value as KeynoteApproachData);
  }

  onAutoSave(value: Record<string, string>) {
    this.autoSaveRequested.emit(value as KeynoteApproachData);
  }
}
