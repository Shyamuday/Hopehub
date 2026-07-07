import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { IntegrativeFollowUpApproachData } from '@vitalis/homeopathy-approaches';
import { installApproachPanelAutoSave } from '../../approach-panel-autosave';

function emptyFollowUp(): IntegrativeFollowUpApproachData {
  return {
    baselineMetrics: '',
    subjectiveMarkers: '',
    objectiveReports: '',
    safetyRedFlags: '',
    referralEscalation: '',
    nextReviewPlan: ''
  };
}

@Component({
  selector: 'app-integrative-follow-up-panel',
  imports: [FormField],
  templateUrl: './integrative-follow-up-panel.html',
  styleUrl: './integrative-follow-up-panel.scss'
})
export class IntegrativeFollowUpPanelComponent implements OnChanges {
  private readonly hydrating = signal(true);
  private readonly autoSave = installApproachPanelAutoSave(
    () => this.model(),
    (value) => this.autoSaveRequested.emit(value),
    () => this.hydrating()
  );

  @Input() initial: IntegrativeFollowUpApproachData | null = null;
  @Input() saving = false;

  readonly saveRequested = output<IntegrativeFollowUpApproachData>();
  readonly autoSaveRequested = output<IntegrativeFollowUpApproachData>();

  readonly model = signal(emptyFollowUp());
  readonly form = form(this.model);

  ngOnChanges() {
    this.hydrating.set(true);
    const next = { ...emptyFollowUp(), ...(this.initial || {}) };
    this.model.set(next);
    this.autoSave.resetSnapshot(next);
    this.hydrating.set(false);
  }

  save() {
    this.autoSave.resetSnapshot(this.model());
    this.saveRequested.emit(this.model());
  }
}
