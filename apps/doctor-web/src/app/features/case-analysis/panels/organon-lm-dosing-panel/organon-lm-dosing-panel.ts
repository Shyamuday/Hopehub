import { Component, Input, output } from '@angular/core';
import { specializedPanelDef, type OrganonLmApproachData } from '@hopehub/homeopathy-approaches';
import { ApproachCapturePanelComponent } from '../approach-capture-panel/approach-capture-panel';

@Component({
  selector: 'app-organon-lm-dosing-panel',
  imports: [ApproachCapturePanelComponent],
  template: `
    @if (panelConfig; as config) {
      <app-approach-capture-panel
        [config]="config"
        [initial]="initialRecord"
        [saving]="saving"
        [headerExtra]="headerHint"
        (saveRequested)="onSave($event)"
        (autoSaveRequested)="onAutoSave($event)"
        (fieldSuggestRequested)="fieldSuggestRequested.emit($event)"
      />
    }
  `
})
export class OrganonLmDosingPanelComponent {
  readonly panelConfig = specializedPanelDef('organon-lm-dosing');

  @Input() initial: OrganonLmApproachData | null = null;
  @Input() saving = false;
  @Input() selectedRemedyName = '';

  readonly saveRequested = output<OrganonLmApproachData>();
  readonly autoSaveRequested = output<OrganonLmApproachData>();
  readonly fieldSuggestRequested = output<{ field: import('@hopehub/homeopathy-approaches').ApproachFieldDef; currentValue: string }>();

  get initialRecord() {
    return (this.initial || null) as Record<string, string> | null;
  }

  get headerHint() {
    if (!this.panelConfig) return '';
    if (this.selectedRemedyName) {
      return `${this.panelConfig.hint} Selected remedy: ${this.selectedRemedyName}.`;
    }
    return `${this.panelConfig.hint} Select a remedy first, then plan LM potency and schedule.`;
  }

  onSave(value: Record<string, string>) {
    this.saveRequested.emit(value as OrganonLmApproachData);
  }

  onAutoSave(value: Record<string, string>) {
    this.autoSaveRequested.emit(value as OrganonLmApproachData);
  }
}
