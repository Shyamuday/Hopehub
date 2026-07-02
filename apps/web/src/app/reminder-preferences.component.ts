import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [FormsModule],
  templateUrl: './reminder-preferences.component.html'
})
export class ReminderPreferencesComponent {
  readonly DEFAULT_QUIET_HOURS = DEFAULT_QUIET_HOURS;
  @Input() prefs: ReminderPrefs = { inApp: true, sms: false, whatsapp: false, push: false, quietHoursStart: '', quietHoursEnd: '' };
  @Input() disabled = false;

  @Output() saved = new EventEmitter<ReminderPrefs>();
}
