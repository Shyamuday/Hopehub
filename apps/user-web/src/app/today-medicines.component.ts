import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DoseEvent } from './models';

export const DOSE_SKIP_REASONS = [
  'Forgot to take',
  'Side effects',
  'Not at home',
  'Ran out of medicine',
  'Doctor advised to pause',
] as const;

export const DOSE_MISSED_REASONS = [
  'Forgot to take',
  'Was travelling',
  'Felt unwell',
  'Could not find medicine',
  'Phone was off / no reminder',
] as const;

export const SNOOZE_OPTIONS = [15, 30, 60] as const;

@Component({
  selector: 'app-today-medicines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './today-medicines.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './today-medicines.component.scss',
})
export class TodayMedicinesComponent {
  readonly skipReasons = DOSE_SKIP_REASONS;
  readonly missedReasons = DOSE_MISSED_REASONS;
  readonly snoozeOptions = SNOOZE_OPTIONS;

  @Input() todayDoses: DoseEvent[] = [];
  @Input() needingReason: DoseEvent[] = [];
  @Input() disabled = false;
  @Input() snoozeMinutes = 30;

  @Output() taken = new EventEmitter<string>();
  @Output() skipped = new EventEmitter<{ id: string; note: string }>();
  @Output() snoozed = new EventEmitter<{ id: string; minutes: number }>();
  @Output() explained = new EventEmitter<{ id: string; note: string }>();
  @Output() snoozeMinutesChange = new EventEmitter<number>();

  skippingDoseId = '';
  skipNote = '';
  explainingDoseId = '';
  explainNote = '';

  startSkip(doseId: string) {
    this.skippingDoseId = doseId;
    this.skipNote = '';
    this.explainingDoseId = '';
  }

  cancelSkip() {
    this.skippingDoseId = '';
    this.skipNote = '';
  }

  confirmSkip(doseId: string) {
    const note = this.skipNote.trim();
    if (note.length < 2) {
      return;
    }
    this.skipped.emit({ id: doseId, note });
    this.cancelSkip();
  }

  startExplain(doseId: string) {
    this.explainingDoseId = doseId;
    this.explainNote = '';
    this.skippingDoseId = '';
  }

  cancelExplain() {
    this.explainingDoseId = '';
    this.explainNote = '';
  }

  confirmExplain(doseId: string) {
    const note = this.explainNote.trim();
    if (note.length < 2) {
      return;
    }
    this.explained.emit({ id: doseId, note });
    this.cancelExplain();
  }

  applySnoozePreset(doseId: string, minutes: number) {
    this.snoozeMinutes = minutes;
    this.snoozeMinutesChange.emit(minutes);
    this.snoozed.emit({ id: doseId, minutes });
  }

  isSnoozedNote(note?: string | null) {
    return Boolean(note?.startsWith('Snoozed by'));
  }

  showInTodaySchedule(dose: DoseEvent) {
    if (dose.status === 'PENDING' || dose.status === 'TAKEN') {
      return true;
    }
    return !this.needingReason.some((item) => item.id === dose.id);
  }
}
