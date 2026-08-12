import { Component, OnInit, output, input, signal, inject } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { BookingService, NotificationService } from '../../../core/services';
import type { HopeHubSlotDay, HopeHubSlotDayStatus } from '../../../core/services';

export interface TimeSlot {
  time: string;
  available: boolean;
  booked?: boolean;
}

export interface AppointmentSlot {
  date: Date;
  time: string;
  consultant?: string;
}

interface AppointmentDay {
  date: Date;
  dateKey: string;
  label: string;
  shortLabel: string;
  slots: TimeSlot[];
  dayStatus?: HopeHubSlotDayStatus | 'LOAD_ERROR';
  dayStatusLabel?: string;
  emptyMessage?: string;
  capacityMessage?: string;
  loading: boolean;
}

type CalendarSlotDay =
  | HopeHubSlotDay
  | {
      date: string;
      dayStatus: 'LOAD_ERROR';
      dayStatusLabel: string;
      emptyMessage: string;
      capacityMessage?: string;
      slots: [];
    };

@Component({
  selector: 'app-appointment-calendar',
  standalone: true,
  imports: [],
  templateUrl: './appointment-calendar.component.html',
  styleUrl: './appointment-calendar.component.scss',
})
export class AppointmentCalendarComponent implements OnInit {
  private bookingService = inject(BookingService);
  private notificationService = inject(NotificationService);

  appointmentSelected = output<AppointmentSlot>();
  selectedService = input<string | undefined>(undefined);
  providerId = input<string | undefined>(undefined);
  careTeamServiceId = input<string | undefined>(undefined);

  selectedDate = signal<Date | null>(null);
  selectedTime = signal<string | null>(null);
  appointmentDays = signal<AppointmentDay[]>([]);
  isLoadingSlots = signal(false);

  ngOnInit() {
    this.loadNextThreeDays();
  }

  selectDate(date: Date) {
    this.selectedDate.set(new Date(date));
    this.selectedTime.set(null);

    const day = this.appointmentDays().find(
      (item) => item.date.toDateString() === date.toDateString(),
    );
    const firstAvailableSlot = day?.slots.find((slot) => slot.available);
    if (firstAvailableSlot) {
      this.selectTimeSlot(firstAvailableSlot);
    }
  }

  selectTimeSlot(slot: TimeSlot) {
    if (!slot.available) return;

    this.selectedTime.set(slot.time);

    if (this.selectedDate() && this.selectedTime()) {
      this.appointmentSelected.emit({
        date: this.selectedDate()!,
        time: this.selectedTime()!,
        consultant: this.selectedService(),
      });
    }
  }

  isSelectedDate(date: Date): boolean {
    return this.selectedDate()?.toDateString() === date.toDateString();
  }

  isSelectedTime(time: string): boolean {
    return this.selectedTime() === time;
  }

  selectedDaySlots(): TimeSlot[] {
    const selected = this.selectedDate();
    if (!selected) return [];

    return (
      this.appointmentDays().find((day) => day.date.toDateString() === selected.toDateString())
        ?.slots || []
    );
  }

  availableCount(day: AppointmentDay): number {
    return day.slots.filter((slot) => slot.available).length;
  }

  dayStatus(day: AppointmentDay): string {
    if (day.loading) return 'Loading';
    if (day.dayStatusLabel) return day.dayStatusLabel;
    const available = this.availableCount(day);
    if (available) return `${available} slots`;
    return day.slots.length ? 'Full' : 'No slots';
  }

  emptySlotsMessage(): string {
    const days = this.appointmentDays();
    const backendMessage = days.find((day) => day.emptyMessage)?.emptyMessage;
    if (backendMessage) return backendMessage;
    const capacityMessage = days.find((day) => day.capacityMessage)?.capacityMessage;
    if (capacityMessage) return capacityMessage;
    const hasSlots = days.some((day) => day.slots.length);
    if (!hasSlots && this.providerId()) {
      return 'This provider has not opened slots in the next three days.';
    }
    if (!hasSlots) return 'No open slots in the next three days.';
    return 'All listed slots are booked in the next three days.';
  }

  private loadNextThreeDays(): void {
    const days = Array.from({ length: 3 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + index);

      return {
        date,
        dateKey: this.formatLocalDate(date),
        label:
          index === 0
            ? 'Today'
            : index === 1
              ? 'Tomorrow'
              : date.toLocaleDateString('en-US', { weekday: 'short' }),
        shortLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        slots: [],
        loading: true,
      };
    });

    this.isLoadingSlots.set(true);
    this.appointmentDays.set(days);

    forkJoin(
      days.map((day) =>
        this.bookingService.slots(day.dateKey, this.providerId(), this.careTeamServiceId()).pipe(
          catchError(() =>
            of<CalendarSlotDay>({
              date: day.dateKey,
              dayStatus: 'LOAD_ERROR' as const,
              dayStatusLabel: 'Unavailable',
              emptyMessage: 'Could not load appointment slots right now.',
              capacityMessage: undefined,
              slots: [],
            }),
          ),
        ),
      ),
    ).subscribe({
      next: (responses) => {
        const updatedDays = days.map((day, index) => ({
          ...day,
          dayStatus: responses[index].dayStatus,
          dayStatusLabel: responses[index].dayStatusLabel,
          emptyMessage: responses[index].emptyMessage,
          capacityMessage: responses[index].capacityMessage,
          slots: responses[index].slots.map((slot) => ({
            time: slot.time,
            available: slot.available,
            booked: slot.booked,
          })),
          loading: false,
        }));

        this.appointmentDays.set(updatedDays);
        this.isLoadingSlots.set(false);
        this.autoSelectFirstAvailableSlot(updatedDays);
      },
      error: () => {
        this.appointmentDays.set(days.map((day) => ({ ...day, loading: false })));
        this.isLoadingSlots.set(false);
        this.notificationService.error('Could not load appointment slots right now.');
      },
    });
  }

  private autoSelectFirstAvailableSlot(days: AppointmentDay[]): void {
    const firstAvailableDay = days.find((day) => day.slots.some((slot) => slot.available));
    const firstAvailableSlot = firstAvailableDay?.slots.find((slot) => slot.available);

    if (!firstAvailableDay || !firstAvailableSlot) return;

    this.selectedDate.set(new Date(firstAvailableDay.date));
    this.selectTimeSlot(firstAvailableSlot);
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
