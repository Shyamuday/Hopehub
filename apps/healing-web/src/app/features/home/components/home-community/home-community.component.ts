import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../../../core';
import { Meetup } from '../../../../core/models';

@Component({
  selector: 'app-home-community',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home-community.component.html',
})
export class HomeCommunityComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;

  readonly nextMeetup: Meetup = {
    id: '1',
    title: 'Monthly Healing Circle',
    description: 'A supportive group session focused on sharing experiences and healing together.',
    date: this.getNextFirstSunday(),
    time: '2:00 PM - 4:00 PM',
    location: 'Virtual Meeting',
    isVirtual: true,
    maxAttendees: 20,
  };

  formatMeetupDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private getNextFirstSunday(): Date {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let firstSunday = new Date(currentYear, currentMonth, 1);

    while (firstSunday.getDay() !== 0) {
      firstSunday.setDate(firstSunday.getDate() + 1);
    }

    if (firstSunday < now) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      firstSunday = new Date(nextYear, nextMonth, 1);

      while (firstSunday.getDay() !== 0) {
        firstSunday.setDate(firstSunday.getDate() + 1);
      }
    }

    return firstSunday;
  }
}
