import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meetup } from '../../core/models/meetup.model';
import { APP_CONSTANTS } from '../../core';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [],
  template: `
    <div class="container mx-auto px-4 py-8">
      <!-- Hero Section -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          Join Our Healing Community
        </h1>
        <p class="text-lg text-gray-600 max-w-3xl mx-auto">
          Connect with others on their healing journey, share experiences, and find support in our welcoming community.
        </p>
      </div>

      <!-- Community Benefits Section -->
      <div class="mb-12">
        <h2 class="text-3xl font-semibold text-gray-900 mb-6 text-center">
          Why Join Our Community?
        </h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center p-6 bg-blue-50 rounded-lg">
            <div class="text-blue-600 text-4xl mb-4">🤝</div>
            <h3 class="text-xl font-semibold mb-2">Peer Support</h3>
            <p class="text-gray-600">Connect with others who understand your journey and share similar experiences.</p>
          </div>
          <div class="text-center p-6 bg-green-50 rounded-lg">
            <div class="text-green-600 text-4xl mb-4">📚</div>
            <h3 class="text-xl font-semibold mb-2">Resources & Tips</h3>
            <p class="text-gray-600">Access helpful resources, coping strategies, and wellness tips shared by our community.</p>
          </div>
          <div class="text-center p-6 bg-purple-50 rounded-lg">
            <div class="text-purple-600 text-4xl mb-4">🌱</div>
            <h3 class="text-xl font-semibold mb-2">Growth Together</h3>
            <p class="text-gray-600">Participate in group activities and workshops designed to support your healing process.</p>
          </div>
        </div>
      </div>

      <!-- Telegram Community Section -->
      <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-8 mb-12">
        <div class="text-center">
          <h2 class="text-3xl font-bold mb-4">Join Our Telegram Community</h2>
          <p class="text-lg mb-6 opacity-90">
            Stay connected with our community 24/7. Share your thoughts, ask questions, and receive support from fellow members and our team.
          </p>
          <button 
            (click)="joinTelegramGroup()"
            class="bg-white text-blue-600 font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors duration-200 inline-flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.03c.19-.17-.04-.27-.3-.1L9.28 13.47l-2.38-.75c-.52-.16-.53-.52.11-.77l9.28-3.58c.43-.16.81.11.67.77z"/>
            </svg>
            Join Telegram Group
          </button>
        </div>
      </div>

      <!-- Monthly Meetup Section -->
      <div class="bg-gray-50 rounded-lg p-8">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Monthly Healing Meetups</h2>
          <p class="text-lg text-gray-600">
            Join us every first Sunday of the month for our community healing meetup.
          </p>
        </div>

        <div class="max-w-2xl mx-auto">
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-semibold text-gray-900">{{ nextMeetup.title }}</h3>
              <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {{ nextMeetup.isVirtual ? 'Virtual' : 'In-Person' }}
              </span>
            </div>
            
            <p class="text-gray-600 mb-4">{{ nextMeetup.description }}</p>
            
            <div class="grid md:grid-cols-2 gap-4 mb-4">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span class="text-gray-700">{{ formatDate(nextMeetup.date) }}</span>
              </div>
              <div class="flex items-center">
                <svg class="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-gray-700">{{ nextMeetup.time }}</span>
              </div>
            </div>

            @if (nextMeetup.location || nextMeetup.virtualLink) {
              <div class="flex items-center mb-4">
              <svg class="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span class="text-gray-700">
                {{ nextMeetup.isVirtual ? 'Virtual Meeting' : nextMeetup.location }}
              </span>
              </div>
            }

            <div class="flex items-center justify-between">
              @if (nextMeetup.maxAttendees) {
                <div class="text-sm text-gray-500">
                  Limited to {{ nextMeetup.maxAttendees }} attendees
                </div>
              }
              <button 
                (click)="handleMeetupAction()"
                class="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                {{ nextMeetup.isVirtual ? 'Get Meeting Link' : 'RSVP Now' }}
              </button>
            </div>
          </div>
        </div>

        <div class="text-center mt-8">
          <p class="text-gray-600">
            Can't make it this month? Don't worry! We host these meetups every first Sunday of the month.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CommunityComponent {
  APP_CONSTANTS = APP_CONSTANTS;

  nextMeetup: Meetup = {
    id: 'monthly-meetup-' + new Date().getFullYear() + '-' + (new Date().getMonth() + 1),
    title: 'Monthly Healing Circle',
    description: 'Join us for a supportive group session where we share experiences, practice mindfulness, and build connections with fellow community members.',
    date: this.getNextFirstSunday(),
    time: '2:00 PM - 4:00 PM EST',
    location: 'Community Center - 123 Wellness Ave, Healing City',
    virtualLink: 'https://meet.healinghub.com/monthly-meetup',
    isVirtual: false,
    maxAttendees: 25
  };

  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private getNextFirstSunday(): Date {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Start with the first day of current month
    let firstSunday = new Date(currentYear, currentMonth, 1);

    // Find the first Sunday of the month
    while (firstSunday.getDay() !== 0) {
      firstSunday.setDate(firstSunday.getDate() + 1);
    }

    // If the first Sunday has passed, get the first Sunday of next month
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

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  joinTelegramGroup(): void {
    if (!this.isBrowser) return;
    // External link handling for Telegram group redirect
    const telegramGroupUrl = APP_CONSTANTS.TELEGRAM.GROUP_URL;
    window.open(telegramGroupUrl, '_blank', 'noopener,noreferrer');
  }

  handleMeetupAction(): void {
    if (!this.isBrowser) return;

    if (this.nextMeetup.isVirtual && this.nextMeetup.virtualLink) {
      window.open(this.nextMeetup.virtualLink, '_blank', 'noopener,noreferrer');
    } else {
      // For in-person meetups, could redirect to RSVP form or contact page
      // For now, we'll show an alert with contact information
      alert('To RSVP for this meetup, please contact us through our contact form or join our Telegram group for more details.');
    }
  }
}