import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DEFAULT_QUIET_HOURS } from './core/constants/timing.constants';

export type ReminderPrefs = {
  inApp: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

@Component({
  selector: 'app-reminder-preferences',
  standalone: true,
  imports: [FormField],
  templateUrl: './reminder-preferences.component.html',
  styleUrl: './reminder-preferences.component.scss',
})
export class ReminderPreferencesComponent implements OnChanges {
  readonly DEFAULT_QUIET_HOURS = DEFAULT_QUIET_HOURS;
  @Input() prefs: ReminderPrefs = {
    inApp: true,
    sms: false,
    whatsapp: false,
    push: false,
    quietHoursStart: '',
    quietHoursEnd: '',
  };
  @Input() disabled = false;

  @Output() saved = new EventEmitter<ReminderPrefs>();

  readonly prefsFormModel = signal<ReminderPrefs>({
    inApp: true,
    sms: false,
    whatsapp: false,
    push: false,
    quietHoursStart: '',
    quietHoursEnd: '',
  });
  readonly prefsForm = form(this.prefsFormModel);

  ngOnChanges() {
    this.prefsFormModel.set({ ...this.prefs });
  }

  save() {
    this.saved.emit({ ...this.prefsFormModel() });
  }
}
