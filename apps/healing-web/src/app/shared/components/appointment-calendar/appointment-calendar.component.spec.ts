import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BookingService, NotificationService } from '../../../core/services';
import {
  AppointmentCalendarComponent,
  type AppointmentSlot,
} from './appointment-calendar.component';

describe('AppointmentCalendarComponent', () => {
  let fixture: ComponentFixture<AppointmentCalendarComponent>;
  const bookingService = {
    slots: vi.fn((date: string) =>
      of({
        date,
        dayStatus: 'AVAILABLE',
        dayStatusLabel: '3 slots',
        emptyMessage: '',
        slots: [
          { time: '10:30 AM', available: true, booked: false },
          { time: '11:30 AM', available: true, booked: false },
          { time: '1:00 PM', available: true, booked: false },
        ],
      }),
    ),
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 4, 10, 10, 0));
    await TestBed.configureTestingModule({
      imports: [AppointmentCalendarComponent],
      providers: [
        { provide: BookingService, useValue: bookingService },
        { provide: NotificationService, useValue: { error: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppointmentCalendarComponent);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('preselects the earliest available slot at least one hour from now', () => {
    const selected: AppointmentSlot[] = [];
    fixture.componentRef.setInput('autoSelectEarliest', true);
    fixture.componentInstance.appointmentSelected.subscribe((appointment) =>
      selected.push(appointment),
    );

    fixture.detectChanges();

    expect(fixture.componentInstance.selectedTime()).toBe('11:30 AM');
    expect(selected).toHaveLength(1);
    expect(selected[0].time).toBe('11:30 AM');
    expect(selected[0].consultant).toBeUndefined();
  });
});
