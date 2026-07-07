import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { SensationApproachData } from '@vitalis/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';

const KINGDOMS = ['Plant', 'Mineral', 'Animal', 'Nosode', 'Impossible to classify yet'] as const;

function emptySensation(): SensationApproachData {
  return {
    patientLanguage: '',
    coreSensation: '',
    kingdom: '',
    remedyFamily: '',
    levelOfExperience: ''
  };
}

@Component({
  selector: 'app-sensation-capture-panel',
  imports: [FormField],
  templateUrl: './sensation-capture-panel.html',
  styleUrl: './sensation-capture-panel.scss'
})
export class SensationCapturePanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating()
  );

  readonly kingdoms = KINGDOMS;

  @Input() initial: SensationApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<SensationApproachData>();
  readonly autoSaveRequested = output<SensationApproachData>();

  readonly model = signal(emptySensation());
  readonly form = form(this.model);

  ngOnChanges() {
    this.hydrating.set(true);
    const next = { ...emptySensation(), ...(this.initial || {}) };
    this.model.set(next);
    this.autoSave.resetSnapshot(next);
    this.hydrating.set(false);
  }

  save() {
    this.autoSave.resetSnapshot(this.model());
    this.saveRequested.emit(this.model());
  }
}
