import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
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
  imports: [CommonModule, FormField],
  templateUrl: './today-medicines.component.html',
  styleUrl: './today-medicines.component.scss',
})
export class TodayMedicinesComponent implements OnChanges {
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
  explainingDoseId = '';

  readonly skipNoteModel = signal({ note: '' });
  readonly skipNoteForm = form(this.skipNoteModel);

  readonly explainNoteModel = signal({ note: '' });
  readonly explainNoteForm = form(this.explainNoteModel);

  readonly snoozeModel = signal({ minutes: 30 });

  ngOnChanges() {
    this.snoozeModel.set({ minutes: this.snoozeMinutes });
  }

  startSkip(doseId: string) {
    this.skippingDoseId = doseId;
    this.skipNoteModel.set({ note: '' });
    this.explainingDoseId = '';
  }

  cancelSkip() {
    this.skippingDoseId = '';
    this.skipNoteModel.set({ note: '' });
  }

  confirmSkip(doseId: string) {
    const note = this.skipNoteModel().note.trim();
    if (note.length < 2) {
      return;
    }
    this.skipped.emit({ id: doseId, note });
    this.cancelSkip();
  }

  startExplain(doseId: string) {
    this.explainingDoseId = doseId;
    this.explainNoteModel.set({ note: '' });
    this.skippingDoseId = '';
  }

  cancelExplain() {
    this.explainingDoseId = '';
    this.explainNoteModel.set({ note: '' });
  }

  confirmExplain(doseId: string) {
    const note = this.explainNoteModel().note.trim();
    if (note.length < 2) {
      return;
    }
    this.explained.emit({ id: doseId, note });
    this.cancelExplain();
  }

  setSkipReason(reason: string) {
    this.skipNoteModel.set({ note: reason });
  }

  setExplainReason(reason: string) {
    this.explainNoteModel.set({ note: reason });
  }

  onSnoozeMinutesSelect(event: Event) {
    const minutes = Number((event.target as HTMLSelectElement).value);
    this.snoozeModel.set({ minutes });
    this.snoozeMinutesChange.emit(minutes);
  }

  applySnoozePreset(doseId: string, minutes: number) {
    this.snoozeModel.set({ minutes });
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
