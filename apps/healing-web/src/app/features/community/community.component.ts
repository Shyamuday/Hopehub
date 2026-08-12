import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { Meetup } from '../../core/models/meetup.model';
import { APP_CONSTANTS } from '../../core';
import { AppButtonComponent } from '../../shared/components';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [RouterModule, AppButtonComponent],
  template: `
    <div class="min-h-screen bg-[var(--brand-surface)]">
      <div class="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <!-- Hero Section -->
        <div class="mx-auto mb-6 max-w-3xl text-center">
          <h1 class="mb-2 text-2xl font-semibold text-gray-950 sm:text-3xl">Community</h1>
          <p class="text-sm leading-6 text-gray-700">
            Choose the space that feels comfortable for you.
          </p>
        </div>

        <!-- Community Channels Section -->
        <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Telegram Card -->
          <div
            class="hope-motion-card rounded-lg border border-primary-200 bg-white p-5 text-gray-800 shadow-sm"
          >
            <div>
              <span class="hope-chip mb-3">Recommended</span>
              <h2 class="text-lg font-semibold text-gray-950">Telegram community</h2>
              <p class="mb-4 mt-1 text-sm leading-6 text-gray-700">
                Daily 9 PM voice circle. Use a username when you want more privacy.
              </p>
              <app-button (click)="joinTelegramGroup()" block>
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.03c.19-.17-.04-.27-.3-.1L9.28 13.47l-2.38-.75c-.52-.16-.53-.52.11-.77l9.28-3.58c.43-.16.81.11.67.77z"
                  />
                </svg>
                Join {{ APP_CONSTANTS.TELEGRAM.SUPPORT_HANDLE }}
              </app-button>
              <details class="mt-3 text-center">
                <summary class="cursor-pointer text-xs font-medium text-primary-700">
                  Show QR code
                </summary>
                <img
                  [src]="APP_CONSTANTS.TELEGRAM.QR_CODE"
                  [alt]="'Scan to join ' + APP_CONSTANTS.TELEGRAM.SUPPORT_HANDLE + ' on Telegram'"
                  class="mx-auto mt-3 h-28 w-28 rounded-md border border-gray-100 object-contain"
                />
              </details>
            </div>
          </div>

          <!-- WhatsApp Card -->
          <div
            class="hope-motion-card rounded-lg border border-gray-200 bg-white p-5 text-gray-800 shadow-sm"
          >
            <div>
              <h2 class="text-lg font-semibold text-gray-950">WhatsApp updates</h2>
              <p class="mb-4 mt-1 text-sm leading-6 text-gray-700">
                For reminders and updates. Your phone number may be visible to the group.
              </p>
              <app-button
                [href]="APP_CONSTANTS.WHATSAPP.GROUP_URL"
                target="_blank"
                rel="noopener noreferrer"
                block
              >
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                  />
                </svg>
                Join WhatsApp Group
              </app-button>
              <details class="mt-3 text-center">
                <summary class="cursor-pointer text-xs font-medium text-primary-700">
                  Show QR code
                </summary>
                <img
                  [src]="APP_CONSTANTS.WHATSAPP.QR_CODE"
                  alt="WhatsApp Group QR Code"
                  class="mx-auto mt-3 h-28 w-28 rounded-md border border-gray-100 object-contain"
                />
              </details>
            </div>
          </div>
        </div>

        <details
          class="mb-8 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <summary class="cursor-pointer font-semibold">Group safety</summary>
          <p class="mb-0 mt-2 leading-6">
            {{ notes.communitySafety.text }} Do not share addresses, documents, payment screenshots,
            passwords, or other personal information.
          </p>
        </details>

        <!-- Monthly Meetup Section -->
        <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div class="text-center mb-8">
            <h2 class="text-2xl font-semibold text-gray-950 mb-4">Monthly Healing Meetups</h2>
            <p class="text-base leading-7 text-gray-700">
              A virtual-first support circle planned around India time.
            </p>
          </div>

          <div class="max-w-2xl mx-auto">
            <div class="hope-motion-card rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-semibold text-gray-950">{{ nextMeetup.title }}</h3>
                <span
                  class="rounded-md bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700"
                >
                  {{ nextMeetup.isVirtual ? 'Virtual' : 'In-Person' }}
                </span>
              </div>

              <p class="text-gray-600 mb-4">{{ nextMeetup.description }}</p>

              <div class="grid md:grid-cols-2 gap-4 mb-4">
                <div class="flex items-center">
                  <svg
                    class="w-5 h-5 text-gray-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    ></path>
                  </svg>
                  <span class="text-gray-700">{{ formatDate(nextMeetup.date) }}</span>
                </div>
                <div class="flex items-center">
                  <svg
                    class="w-5 h-5 text-gray-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span class="text-gray-700">{{ nextMeetup.time }}</span>
                </div>
              </div>

              @if (nextMeetup.location || nextMeetup.virtualLink) {
                <div class="flex items-center mb-4">
                  <svg
                    class="w-5 h-5 text-gray-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    ></path>
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                  </svg>
                  <span class="text-gray-700">Virtual Meeting</span>
                </div>
              }

              <div class="flex items-center justify-between">
                @if (nextMeetup.maxAttendees) {
                  <div class="text-sm text-gray-500">
                    Limited to {{ nextMeetup.maxAttendees }} seats
                  </div>
                }
                <app-button (click)="handleMeetupAction()" size="sm"> Ask in Telegram </app-button>
              </div>
            </div>
          </div>

          <div class="text-center mt-8">
            <a routerLink="/contact" class="text-primary-700 font-semibold hover:text-primary-800">
              Need private support instead? Send a request
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class CommunityComponent {
  readonly notes = NOTE_CONTENT;
  APP_CONSTANTS = APP_CONSTANTS;

  nextMeetup: Meetup = {
    id: 'monthly-meetup-' + new Date().getFullYear() + '-' + (new Date().getMonth() + 1),
    title: 'Monthly Healing Circle',
    description:
      'Join a guided virtual support circle for sharing, grounding practice, and gentle next-step planning.',
    date: this.getNextFirstSunday(),
    time: '2:00 PM - 4:00 PM IST',
    location: 'Virtual Meeting',
    isVirtual: true,
    maxAttendees: 25,
  };

  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
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
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

    window.open(APP_CONSTANTS.TELEGRAM.GROUP_URL, '_blank', 'noopener,noreferrer');
  }
}
