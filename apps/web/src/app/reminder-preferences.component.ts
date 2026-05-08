import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

export type ReminderPrefs = {
  inApp: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export type ReminderChannelsLive = {
  inApp: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
};

@Component({
  selector: 'app-reminder-preferences',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <div class="panel">
      <h2>{{ 'patient.reminders.title' | translate }}</h2>
      <p class="muted footnote">
        {{ 'patient.reminders.footnote' | translate }}
      </p>
      <label>
        <input type="checkbox" [(ngModel)]="prefs.inApp" [disabled]="disabled || !channelsLive.inApp" />
        {{ 'patient.reminders.inApp' | translate }}
        @if (!channelsLive.inApp) {
          <span class="muted">{{ 'patient.reminders.notAvailable' | translate }}</span>
        }
      </label>
      <label>
        <input type="checkbox" [(ngModel)]="prefs.sms" [disabled]="disabled || !channelsLive.sms" />
        {{ 'patient.reminders.sms' | translate }}
        @if (!channelsLive.sms) {
          <span class="muted">{{ 'patient.reminders.comingSoon' | translate }}</span>
        }
      </label>
      <label>
        <input type="checkbox" [(ngModel)]="prefs.whatsapp" [disabled]="disabled || !channelsLive.whatsapp" />
        {{ 'patient.reminders.whatsapp' | translate }}
        @if (!channelsLive.whatsapp) {
          <span class="muted">{{ 'patient.reminders.comingSoon' | translate }}</span>
        }
      </label>
      <label>
        <input type="checkbox" [(ngModel)]="prefs.push" [disabled]="disabled || !channelsLive.push" />
        {{ 'patient.reminders.push' | translate }}
        @if (!channelsLive.push) {
          <span class="muted">{{ 'patient.reminders.comingSoon' | translate }}</span>
        }
      </label>
      <label>
        {{ 'patient.reminders.quietStart' | translate }}
        <input [(ngModel)]="prefs.quietHoursStart" placeholder="22:00" />
      </label>
      <label>
        {{ 'patient.reminders.quietEnd' | translate }}
        <input [(ngModel)]="prefs.quietHoursEnd" placeholder="07:00" />
      </label>
      <button type="button" class="primary" [disabled]="disabled" (click)="saved.emit(prefs)">
        {{ 'patient.reminders.save' | translate }}
      </button>
    </div>
  `,
  styles: [
    `
      .footnote {
        font-size: 0.88rem;
        margin-bottom: 0.75rem;
      }
    `
  ]
})
export class ReminderPreferencesComponent {
  @Input() prefs: ReminderPrefs = {
    inApp: true,
    sms: false,
    whatsapp: false,
    push: false,
    quietHoursStart: '',
    quietHoursEnd: ''
  };
  @Input() disabled = false;
  @Input() channelsLive: ReminderChannelsLive = {
    inApp: true,
    sms: false,
    whatsapp: false,
    push: false
  };

  @Output() saved = new EventEmitter<ReminderPrefs>();
}
