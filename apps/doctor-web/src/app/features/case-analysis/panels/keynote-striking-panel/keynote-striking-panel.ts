import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { KeynoteApproachData } from '@vitalis/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';

function emptyKeynote(): KeynoteApproachData {
  return {
    strikingSymptoms: '',
    peculiarRareSymptoms: '',
    totalityCrossCheck: '',
    differentialShortlist: ''
  };
}

@Component({
  selector: 'app-keynote-striking-panel',
  imports: [FormField],
  templateUrl: './keynote-striking-panel.html',
  styleUrl: './keynote-striking-panel.scss'
})
export class KeynoteStrikingPanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating()
  );

  @Input() initial: KeynoteApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<KeynoteApproachData>();
  readonly autoSaveRequested = output<KeynoteApproachData>();

  readonly model = signal(emptyKeynote());
  readonly form = form(this.model);

  ngOnChanges() {
    this.hydrating.set(true);
    const next = { ...emptyKeynote(), ...(this.initial || {}) };
    this.model.set(next);
    this.autoSave.resetSnapshot(next);
    this.hydrating.set(false);
  }

  save() {
    this.autoSave.resetSnapshot(this.model());
    this.saveRequested.emit(this.model());
  }
}
