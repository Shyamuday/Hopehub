import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { ScholtenApproachData } from '@vitalis/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';

const SCHOLTEN_SERIES = [
  'Hydrogen',
  'Carbon',
  'Silicium',
  'Ferrum',
  'Silver series',
  'Gold series',
  'Lanthanides',
  'Uranium',
  'Unclear / mixed'
] as const;

const STAGES = Array.from({ length: 18 }, (_, index) => String(index + 1));

function emptyScholten(): ScholtenApproachData {
  return {
    thematicPattern: '',
    series: '',
    stage: '',
    mineralShortlist: '',
    confirmationNotes: ''
  };
}

@Component({
  selector: 'app-scholten-mapper-panel',
  imports: [FormField],
  templateUrl: './scholten-mapper-panel.html',
  styleUrl: './scholten-mapper-panel.scss'
})
export class ScholtenMapperPanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating()
  );

  readonly seriesOptions = SCHOLTEN_SERIES;
  readonly stageOptions = STAGES;

  @Input() initial: ScholtenApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<ScholtenApproachData>();
  readonly autoSaveRequested = output<ScholtenApproachData>();

  readonly model = signal(emptyScholten());
  readonly form = form(this.model);

  ngOnChanges() {
    this.hydrating.set(true);
    const next = { ...emptyScholten(), ...(this.initial || {}) };
    this.model.set(next);
    this.autoSave.resetSnapshot(next);
    this.hydrating.set(false);
  }

  save() {
    this.autoSave.resetSnapshot(this.model());
    this.saveRequested.emit(this.model());
  }
}
