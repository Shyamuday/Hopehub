import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { Meetup } from '../../core/models/meetup.model';
import { APP_CONSTANTS } from '../../core';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="min-h-screen bg-[var(--brand-surface)]">
      <div class="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <!-- Hero Section -->
        <div class="mx-auto mb-10 max-w-3xl text-center">
          <h1 class="mb-4 text-3xl font-semibold text-gray-950 sm:text-4xl">
            Join Our Healing Community
          </h1>
          <p class="mx-auto max-w-2xl text-base leading-7 text-gray-700 sm:text-lg">
            Join low-pressure support spaces for mental wellness, emotional healing, and practical
            coping. Share only what feels safe, and choose Telegram when identity privacy matters.
          </p>
        </div>

        <!-- Community Benefits Section -->
        <div class="mb-12">
          <h2 class="text-center text-2xl font-semibold text-gray-950 mb-6">
            Why Join Our Community?
          </h2>
          <div class="grid md:grid-cols-3 gap-8">
            <div
              class="hope-motion-card rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm"
            >
              <div
                class="hope-motion-icon mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-sm font-semibold text-primary-700"
              >
                ID
              </div>
              <h3 class="mb-2 text-lg font-semibold text-gray-950">Low-Identity Support</h3>
              <p class="text-sm leading-6 text-gray-700">
                Use a display name or username and talk only as much as you feel comfortable
                sharing.
              </p>
            </div>
            <div
              class="hope-motion-card rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm"
            >
              <div
                class="hope-motion-icon mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-sm font-semibold text-primary-700"
              >
                01
              </div>
              <h3 class="mb-2 text-lg font-semibold text-gray-950">Resources & Tips</h3>
              <p class="text-sm leading-6 text-gray-700">
                Get coping prompts, self-care ideas, and service guidance without pressure to book.
              </p>
            </div>
            <div
              class="hope-motion-card rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm"
            >
              <div
                class="hope-motion-icon mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-sm font-semibold text-primary-700"
              >
                30
              </div>
              <h3 class="mb-2 text-lg font-semibold text-gray-950">Growth Together</h3>
              <p class="text-sm leading-6 text-gray-700">
                Move from chat to a 30-minute paid support session when you want focused help.
              </p>
            </div>
          </div>
        </div>

        <div class="mb-12 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div class="grid gap-6 md:grid-cols-3">
            <div>
              <h2 class="text-2xl font-semibold text-gray-900">Community Safety Rules</h2>
              <div class="group relative mt-3 inline-flex">
                <button
                  type="button"
                  class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900"
                >
                  {{ notes.communitySafety.label }}
                </button>
                <div
                  class="invisible absolute left-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-amber-200 bg-white p-3 text-sm leading-6 text-amber-900 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                >
                  {{ notes.communitySafety.text }}
                </div>
              </div>
            </div>
            <ul class="space-y-3 text-sm leading-6 text-gray-700 md:col-span-2">
              <li class="rounded-md bg-slate-50 p-3">
                Do not share full address, private documents, payment screenshots, or passwords in
                any group.
              </li>
              <li class="rounded-md bg-slate-50 p-3">
                Telegram is preferred for low-identity discussion; your privacy still depends on
                your Telegram settings.
              </li>
              <li class="rounded-md bg-slate-50 p-3">
                For paid help, use the request form so the team can confirm payment, concern type,
                and contact preference properly.
              </li>
            </ul>
          </div>
        </div>

        <!-- Community Channels Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <!-- Telegram Card -->
          <div
            class="hope-motion-card rounded-lg border border-gray-200 bg-white p-6 text-gray-800 shadow-sm sm:p-8"
          >
            <div>
              <h2 class="text-2xl font-semibold mb-3 text-gray-950">Anonymous-Friendly Telegram</h2>
              <ul class="mb-4 space-y-3 text-sm leading-6 text-gray-700">
                <li class="rounded-lg bg-gray-50 p-3">
                  Daily 9 PM voice chat with Hope Hub experts.
                </li>
                <li class="rounded-lg bg-gray-50 p-3">
                  24/7 chat support for low-pressure conversation and guidance.
                </li>
                <li class="rounded-lg bg-gray-50 p-3">
                  Join with a username or display name if identity privacy matters.
                </li>
              </ul>
              <div class="flex justify-center mb-4">
                <img
                  [src]="APP_CONSTANTS.TELEGRAM.QR_CODE"
                  [alt]="'Scan to join ' + APP_CONSTANTS.TELEGRAM.SUPPORT_HANDLE + ' on Telegram'"
                  class="w-36 h-36 rounded-xl object-contain border border-gray-100"
                />
              </div>
              <p class="text-center text-xs text-gray-400 mb-3">
                Scan or click to join <strong>{{ APP_CONSTANTS.TELEGRAM.SUPPORT_HANDLE }}</strong>
              </p>
              <button (click)="joinTelegramGroup()" class="btn-primary w-full justify-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.03c.19-.17-.04-.27-.3-.1L9.28 13.47l-2.38-.75c-.52-.16-.53-.52.11-.77l9.28-3.58c.43-.16.81.11.67.77z"
                  />
                </svg>
                Join {{ APP_CONSTANTS.TELEGRAM.SUPPORT_HANDLE }}
              </button>
            </div>
          </div>

          <!-- WhatsApp Card -->
          <div
            class="hope-motion-card rounded-lg border border-gray-200 bg-white p-6 text-gray-800 shadow-sm sm:p-8"
          >
            <div>
              <h2 class="text-2xl font-semibold mb-3 text-gray-950">Join Our WhatsApp Group</h2>
              <ul class="mb-4 space-y-3 text-sm leading-6 text-gray-700">
                <li class="rounded-lg bg-gray-50 p-3">
                  Good for quick updates, reminders, and follow-up messages.
                </li>
                <li class="rounded-lg bg-gray-50 p-3">
                  Use it when you are comfortable with WhatsApp group identity visibility.
                </li>
                <li class="rounded-lg bg-gray-50 p-3">
                  Your phone number may be visible according to WhatsApp group settings.
                </li>
                <li class="rounded-lg bg-gray-50 p-3">
                  For sensitive concerns, Telegram is better for low-identity discussion.
                </li>
              </ul>
              <div class="flex justify-center mb-4">
                <img
                  [src]="APP_CONSTANTS.WHATSAPP.QR_CODE"
                  alt="WhatsApp Group QR Code"
                  class="w-32 h-32 rounded-lg bg-white p-1"
                />
              </div>
              <a
                [href]="APP_CONSTANTS.WHATSAPP.GROUP_URL"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-primary"
              >
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                  />
                </svg>
                Join WhatsApp Group
              </a>
            </div>
          </div>
        </div>

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
                <button (click)="handleMeetupAction()" class="btn-primary btn-sm">
                  Ask in Telegram
                </button>
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
