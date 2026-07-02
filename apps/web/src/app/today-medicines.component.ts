import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DoseEvent } from './models';

@Component({
  selector: 'app-today-medicines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './today-medicines.component.html'
})
export class TodayMedicinesComponent {
  @Input() doseEvents: DoseEvent[] = [];
  @Input() disabled = false;
  @Input() snoozeMinutes = 30;

  @Output() taken = new EventEmitter<string>();
  @Output() skipped = new EventEmitter<string>();
  @Output() snoozed = new EventEmitter<string>();
  @Output() snoozeMinutesChange = new EventEmitter<number>();
}
