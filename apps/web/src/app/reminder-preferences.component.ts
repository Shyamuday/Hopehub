import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  template: `
    <div class="panel">
      <h2>Reminder Preferences</h2>
      <label><input type="checkbox" [(ngModel)]="prefs.inApp" /> In-app</label>
      <label><input type="checkbox" [(ngModel)]="prefs.sms" /> SMS</label>
      <label><input type="checkbox" [(ngModel)]="prefs.whatsapp" /> WhatsApp</label>
      <label><input type="checkbox" [(ngModel)]="prefs.push" /> Push</label>
      <label>
        Quiet hours start
        <input [(ngModel)]="prefs.quietHoursStart" placeholder="22:00" />
      </label>
      <label>
        Quiet hours end
        <input [(ngModel)]="prefs.quietHoursEnd" placeholder="07:00" />
      </label>
      <button class="primary" [disabled]="disabled" (click)="saved.emit(prefs)">Save preferences</button>
    </div>
  `
})
export class ReminderPreferencesComponent {
  @Input() prefs: ReminderPrefs = { inApp: true, sms: false, whatsapp: false, push: false, quietHoursStart: '', quietHoursEnd: '' };
  @Input() disabled = false;

  @Output() saved = new EventEmitter<ReminderPrefs>();
}
