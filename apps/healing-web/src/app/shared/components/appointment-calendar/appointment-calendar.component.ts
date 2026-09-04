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
  daysToShow = input<number>(7);
  autoSelectEarliest = input(false);

  selectedDate = signal<Date | null>(null);
  selectedTime = signal<string | null>(null);
  appointmentDays = signal<AppointmentDay[]>([]);
  isLoadingSlots = signal(false);

  ngOnInit() {
    this.loadNextDays();
  }

  selectDate(date: Date) {
    this.selectedDate.set(new Date(date));
    this.selectedTime.set(null);

    const day = this.appointmentDays().find(
      (item) => item.date.toDateString() === date.toDateString(),
    );
  }

  selectTimeSlot(slot: TimeSlot) {
    if (!slot.available) return;

    this.selectedTime.set(slot.time);

    if (this.selectedDate() && this.selectedTime()) {
      this.appointmentSelected.emit({
        date: this.selectedDate()!,
        time: this.selectedTime()!,
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
      return `This provider has not opened slots in the next ${this.daysWindowLabel()}.`;
    }
    if (!hasSlots) return `No open slots in the next ${this.daysWindowLabel()}.`;
    return `All listed slots are booked in the next ${this.daysWindowLabel()}.`;
  }

  private loadNextDays(): void {
    const count = Math.max(1, Math.min(14, Number(this.daysToShow()) || 7));
    const days = Array.from({ length: count }, (_, index) => {
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
        this.selectRecommendedDate(updatedDays);
      },
      error: () => {
        this.appointmentDays.set(days.map((day) => ({ ...day, loading: false })));
        this.isLoadingSlots.set(false);
        this.notificationService.error('Could not load appointment slots right now.');
      },
    });
  }

  private selectRecommendedDate(days: AppointmentDay[]): void {
    const recommendation = this.recommendedAppointment(days);
    const firstAvailableDay = recommendation?.day;
    if (!firstAvailableDay) return;

    this.selectedDate.set(new Date(firstAvailableDay.date));
    if (!this.autoSelectEarliest() || !recommendation) {
      this.selectedTime.set(null);
      return;
    }

    this.selectedTime.set(recommendation.slot.time);
    this.appointmentSelected.emit({
      date: new Date(firstAvailableDay.date),
      time: recommendation.slot.time,
    });
  }

  private recommendedAppointment(
    days: AppointmentDay[],
  ): { day: AppointmentDay; slot: TimeSlot } | null {
    const minimumTime = Date.now() + 60 * 60 * 1000;
    for (const day of days) {
      for (const slot of day.slots) {
        if (!slot.available) continue;
        if (!this.autoSelectEarliest() || this.slotDateTime(day.date, slot.time) >= minimumTime) {
          return { day, slot };
        }
      }
    }
    return null;
  }

  private slotDateTime(date: Date, time: string): number {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
    if (!match) return Number.POSITIVE_INFINITY;
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') hour += 12;
    const value = new Date(date);
    value.setHours(hour, Number(match[2]), 0, 0);
    return value.getTime();
  }

  private daysWindowLabel(): string {
    const count = Math.max(1, Math.min(14, Number(this.daysToShow()) || 7));
    return `${count} day${count === 1 ? '' : 's'}`;
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
