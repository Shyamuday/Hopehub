import { Component, Input, output } from '@angular/core';
import { specializedPanelDef, type MiasmaticApproachData } from '@hopehub/homeopathy-approaches';
import { ApproachCapturePanelComponent } from '../approach-capture-panel/approach-capture-panel';

@Component({
  selector: 'app-miasm-layer-panel',
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
export class MiasmLayerPanelComponent {
  readonly panelConfig = specializedPanelDef('miasm-selector');

  @Input() initial: MiasmaticApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<MiasmaticApproachData>();
  readonly autoSaveRequested = output<MiasmaticApproachData>();
  readonly fieldSuggestRequested = output<{ field: import('@hopehub/homeopathy-approaches').ApproachFieldDef; currentValue: string }>();

  get initialRecord() {
    return (this.initial || null) as Record<string, string> | null;
  }

  onSave(value: Record<string, string>) {
    this.saveRequested.emit(value as MiasmaticApproachData);
  }

  onAutoSave(value: Record<string, string>) {
    this.autoSaveRequested.emit(value as MiasmaticApproachData);
  }
}
