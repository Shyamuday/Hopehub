import { Component, Input, output } from '@angular/core';
import { specializedPanelDef, type IntegrativeFollowUpApproachData } from '@hopehub/homeopathy-approaches';
import { ApproachCapturePanelComponent } from '../approach-capture-panel/approach-capture-panel';

@Component({
  selector: 'app-integrative-follow-up-panel',
  imports: [ApproachCapturePanelComponent],
  template: `
    @if (panelConfig; as config) {
      <app-approach-capture-panel
        [config]="config"
        [initial]="initialRecord"
        [saving]="saving"
        (saveRequested)="onSave($event)"
        (autoSaveRequested)="onAutoSave($event)"
        (fieldSuggestRequested)="fieldSuggestRequested.emit($event)"
      />
    }
  `
})
export class IntegrativeFollowUpPanelComponent {
  readonly panelConfig = specializedPanelDef('integrative-follow-up');

  @Input() initial: IntegrativeFollowUpApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<IntegrativeFollowUpApproachData>();
  readonly autoSaveRequested = output<IntegrativeFollowUpApproachData>();
  readonly fieldSuggestRequested = output<{ field: import('@hopehub/homeopathy-approaches').ApproachFieldDef; currentValue: string }>();

  get initialRecord() {
    return (this.initial || null) as Record<string, string> | null;
  }

  onSave(value: Record<string, string>) {
    this.saveRequested.emit(value as IntegrativeFollowUpApproachData);
  }

  onAutoSave(value: Record<string, string>) {
    this.autoSaveRequested.emit(value as IntegrativeFollowUpApproachData);
  }
}
