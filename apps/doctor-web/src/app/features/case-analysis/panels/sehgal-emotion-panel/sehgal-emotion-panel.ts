import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { SehgalApproachData } from '@vitalis/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';

function emptySehgal(): SehgalApproachData {
  return {
    emotionalDisturbance: '',
    emotionalTrigger: '',
    mindBodyLinkage: '',
    emotionalCoreRemedy: ''
  };
}

@Component({
  selector: 'app-sehgal-emotion-panel',
  imports: [FormField],
  templateUrl: './sehgal-emotion-panel.html',
  styleUrl: './sehgal-emotion-panel.scss'
})
export class SehgalEmotionPanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating()
  );

  @Input() initial: SehgalApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<SehgalApproachData>();
  readonly autoSaveRequested = output<SehgalApproachData>();

  readonly model = signal(emptySehgal());
  readonly form = form(this.model);

  ngOnChanges() {
    this.hydrating.set(true);
    const next = { ...emptySehgal(), ...(this.initial || {}) };
    this.model.set(next);
    this.autoSave.resetSnapshot(next);
    this.hydrating.set(false);
  }

  save() {
    this.autoSave.resetSnapshot(this.model());
    this.saveRequested.emit(this.model());
  }
}
