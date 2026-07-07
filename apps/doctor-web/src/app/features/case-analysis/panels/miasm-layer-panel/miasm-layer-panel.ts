import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { MiasmaticApproachData } from '@vitalis/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';

const MIASM_OPTIONS = ['Psora', 'Sycosis', 'Syphilis', 'Mixed / layered', 'Undetermined'] as const;

function emptyMiasm(): MiasmaticApproachData {
  return {
    presentingLayer: '',
    dominantMiasm: '',
    psoraSigns: '',
    sycosisSigns: '',
    syphilisSigns: '',
    familyMiasm: ''
  };
}

@Component({
  selector: 'app-miasm-layer-panel',
  imports: [FormField],
  templateUrl: './miasm-layer-panel.html',
  styleUrl: './miasm-layer-panel.scss'
})
export class MiasmLayerPanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating()
  );

  readonly miasmOptions = MIASM_OPTIONS;

  @Input() initial: MiasmaticApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<MiasmaticApproachData>();
  readonly autoSaveRequested = output<MiasmaticApproachData>();

  readonly model = signal(emptyMiasm());
  readonly form = form(this.model);

  ngOnChanges() {
    this.hydrating.set(true);
    const next = { ...emptyMiasm(), ...(this.initial || {}) };
    this.model.set(next);
    this.autoSave.resetSnapshot(next);
    this.hydrating.set(false);
  }

  save() {
    this.autoSave.resetSnapshot(this.model());
    this.saveRequested.emit(this.model());
  }
}
