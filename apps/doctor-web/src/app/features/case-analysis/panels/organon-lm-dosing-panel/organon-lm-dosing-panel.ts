import { Component, Input, OnChanges, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { OrganonLmApproachData } from '@vitalis/homeopathy-approaches';

const DILUTION_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

function emptyOrganonLm(): OrganonLmApproachData {
  return {
    baselineVitality: '',
    sensitivityProfile: '',
    selectedLmPotency: '',
    dilutionGlass: '1',
    repetitionSchedule: '',
    responseMonitoring: '',
    adjustmentNotes: ''
  };
}

@Component({
  selector: 'app-organon-lm-dosing-panel',
  imports: [FormField],
  templateUrl: './organon-lm-dosing-panel.html',
  styleUrl: './organon-lm-dosing-panel.scss'
})
export class OrganonLmDosingPanelComponent implements OnChanges {
  readonly dilutionOptions = DILUTION_OPTIONS;

  @Input() initial: OrganonLmApproachData | null = null;
  @Input() selectedRemedyName = '';
  @Input() saving = false;

  readonly saveRequested = output<OrganonLmApproachData>();

  readonly model = signal(emptyOrganonLm());
  readonly form = form(this.model);

  ngOnChanges() {
    this.model.set({ ...emptyOrganonLm(), ...(this.initial || {}) });
  }

  save() {
    this.saveRequested.emit(this.model());
  }
}
