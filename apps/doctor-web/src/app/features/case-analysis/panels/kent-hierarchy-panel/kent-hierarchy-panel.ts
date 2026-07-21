import { Component, Input, output } from '@angular/core';
import { specializedPanelDef, type KentHierarchyData } from '@hopehub/homeopathy-approaches';
import { ApproachCapturePanelComponent } from '../approach-capture-panel/approach-capture-panel';

@Component({
  selector: 'app-kent-hierarchy-panel',
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
export class KentHierarchyPanelComponent {
  readonly panelConfig = specializedPanelDef('kent-hierarchy');

  @Input() initial: KentHierarchyData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<KentHierarchyData>();
  readonly autoSaveRequested = output<KentHierarchyData>();
  readonly rubricPhraseSelected = output<string>();
  readonly fieldSuggestRequested = output<{ field: import('@hopehub/homeopathy-approaches').ApproachFieldDef; currentValue: string }>();

  get initialRecord() {
    return (this.initial || null) as Record<string, string> | null;
  }

  onSave(value: Record<string, string>) {
    this.saveRequested.emit(value as KentHierarchyData);
  }

  onAutoSave(value: Record<string, string>) {
    this.autoSaveRequested.emit(value as KentHierarchyData);
  }
}
