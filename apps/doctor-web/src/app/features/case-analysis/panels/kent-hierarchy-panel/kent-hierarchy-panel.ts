import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { KentHierarchyData } from '@vitalis/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';

function emptyKent(): KentHierarchyData {
  return {
    mentalGenerals: '',
    physicalGenerals: '',
    particularSymptoms: '',
    strikingKeynotes: ''
  };
}

@Component({
  selector: 'app-kent-hierarchy-panel',
  imports: [FormField],
  templateUrl: './kent-hierarchy-panel.html',
  styleUrl: './kent-hierarchy-panel.scss'
})
export class KentHierarchyPanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating()
  );

  @Input() initial: KentHierarchyData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<KentHierarchyData>();
  readonly autoSaveRequested = output<KentHierarchyData>();

  readonly model = signal(emptyKent());
  readonly form = form(this.model);

  ngOnChanges() {
    this.hydrating.set(true);
    const next = { ...emptyKent(), ...(this.initial || {}) };
    this.model.set(next);
    this.autoSave.resetSnapshot(next);
    this.hydrating.set(false);
  }

  save() {
    this.autoSave.resetSnapshot(this.model());
    this.saveRequested.emit(this.model());
  }
}
