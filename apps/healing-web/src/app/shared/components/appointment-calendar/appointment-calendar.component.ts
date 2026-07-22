import { Component, OnInit, output, input, signal } from '@angular/core';

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

@Component({
    selector: 'app-appointment-calendar',
    standalone: true,
    imports: [],
    templateUrl: './appointment-calendar.component.html',
    styleUrl: './appointment-calendar.component.scss'
})
export class AppointmentCalendarComponent implements OnInit {
    appointmentSelected = output<AppointmentSlot>();
    selectedService = input<string | undefined>(undefined);

    currentMonth = signal(new Date());
    selectedDate = signal<Date | null>(null);
    selectedTime = signal<string | null>(null);

    dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    calendarDays = signal<any[]>([]);

    morningSlots = signal<TimeSlot[]>([
        { time: '9:00 AM', available: true },
        { time: '9:30 AM', available: true },
        { time: '10:00 AM', available: true },
        { time: '10:30 AM', available: false, booked: true },
        { time: '11:00 AM', available: true },
        { time: '11:30 AM', available: true }
    ]);

    afternoonSlots = signal<TimeSlot[]>([
        { time: '1:00 PM', available: true },
        { time: '1:30 PM', available: true },
        { time: '2:00 PM', available: false, booked: true },
        { time: '2:30 PM', available: true },
        { time: '3:00 PM', available: true },
        { time: '3:30 PM', available: true },
        { time: '4:00 PM', available: true },
        { time: '4:30 PM', available: false, booked: true }
    ]);

    eveningSlots = signal<TimeSlot[]>([
        { time: '6:00 PM', available: true },
        { time: '6:30 PM', available: true },
        { time: '7:00 PM', available: true },
        { time: '7:30 PM', available: false, booked: true }
    ]);

    ngOnInit() {
        this.generateCalendar();
    }

    generateCalendar() {
        const year = this.currentMonth().getFullYear();
        const month = this.currentMonth().getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const days: any[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            days.push({
                date: new Date(date),
                day: date.getDate(),
                isCurrentMonth,
                isToday,
                available: isCurrentMonth && !isPast && !isWeekend
            });
        }
        this.calendarDays.set(days);
    }

    previousMonth() {
        this.currentMonth.update(month => {
            const newMonth = new Date(month);
            newMonth.setMonth(newMonth.getMonth() - 1);
            return newMonth;
        });
        this.generateCalendar();
        this.selectedDate.set(null);
        this.selectedTime.set(null);
    }

    nextMonth() {
        this.currentMonth.update(month => {
            const newMonth = new Date(month);
            newMonth.setMonth(newMonth.getMonth() + 1);
            return newMonth;
        });
        this.generateCalendar();
        this.selectedDate.set(null);
        this.selectedTime.set(null);
    }

    selectDate(date: Date) {
        this.selectedDate.set(new Date(date));
        this.selectedTime.set(null);
        this.generateTimeSlots();
    }

    selectTimeSlot(slot: TimeSlot) {
        if (!slot.available) return;

        this.selectedTime.set(slot.time);

        if (this.selectedDate() && this.selectedTime()) {
            this.appointmentSelected.emit({
                date: this.selectedDate()!,
                time: this.selectedTime()!,
                consultant: this.selectedService()
            });
        }
    }

    isSelectedDate(date: Date): boolean {
        return this.selectedDate()?.toDateString() === date.toDateString();
    }

    isSelectedTime(time: string): boolean {
        return this.selectedTime() === time;
    }

    private generateTimeSlots() {
        // Simulate dynamic slot availability based on selected date
        const dayOfWeek = this.selectedDate()?.getDay();

        // Weekend slots are limited
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            this.morningSlots.update(slots => slots.map(slot => ({ ...slot, available: Math.random() > 0.5 })));
            this.afternoonSlots.update(slots => slots.map(slot => ({ ...slot, available: Math.random() > 0.3 })));
            this.eveningSlots.update(slots => slots.map(slot => ({ ...slot, available: false })));
        } else {
            // Weekday slots
            this.morningSlots.update(slots => slots.map(slot => ({ ...slot, available: Math.random() > 0.2 })));
            this.afternoonSlots.update(slots => slots.map(slot => ({ ...slot, available: Math.random() > 0.2 })));
            this.eveningSlots.update(slots => slots.map(slot => ({ ...slot, available: Math.random() > 0.4 })));
        }
    }
}