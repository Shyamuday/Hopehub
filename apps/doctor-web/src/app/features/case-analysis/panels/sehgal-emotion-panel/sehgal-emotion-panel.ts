import { Component, Input, output } from '@angular/core';
import { specializedPanelDef, type SehgalApproachData } from '@hopehub/homeopathy-approaches';
import { ApproachCapturePanelComponent } from '../approach-capture-panel/approach-capture-panel';

@Component({
  selector: 'app-sehgal-emotion-panel',
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
export class SehgalEmotionPanelComponent {
  readonly panelConfig = specializedPanelDef('sehgal-emotion');

  @Input() initial: SehgalApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<SehgalApproachData>();
  readonly autoSaveRequested = output<SehgalApproachData>();
  readonly rubricPhraseSelected = output<string>();
  readonly fieldSuggestRequested = output<{ field: import('@hopehub/homeopathy-approaches').ApproachFieldDef; currentValue: string }>();

  get initialRecord() {
    return (this.initial || null) as Record<string, string> | null;
  }

  onSave(value: Record<string, string>) {
    this.saveRequested.emit(value as SehgalApproachData);
  }

  onAutoSave(value: Record<string, string>) {
    this.autoSaveRequested.emit(value as SehgalApproachData);
  }
}
