import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../core';

@Component({
  selector: 'app-telegram',
  standalone: true,
  imports: [RouterModule],
  template: `
    <main class="bg-gradient-to-b from-sky-50 via-white to-white">
      <section class="container mx-auto px-4 py-14 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl text-center">
          <div
            class="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#229ed9] text-white shadow-lg shadow-sky-200"
          >
            <svg
              class="h-8 w-8 translate-x-[-1px] translate-y-[1px]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.16-3.07-2.01 1.93c-.23.23-.42.43-.79.43z"
              />
            </svg>
          </div>
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Telegram Hub</p>
          <h1 class="mt-3 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
            All Hope Hub Telegram bots and groups
          </h1>
          <p class="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-700">
            Choose the right Telegram link for user support, doctors/providers, or our community
            group. These links are managed from one constants file so we can update them anytime.
          </p>
        </div>

        <div class="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          @for (bot of telegram.BOTS; track bot.key) {
            <article
              class="flex h-full flex-col rounded-3xl border border-sky-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wide text-sky-700">
                    {{ bot.audience }}
                  </p>
                  <h2 class="mt-2 text-xl font-bold text-gray-950">{{ bot.title }}</h2>
                </div>
                <span
                  class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700"
                  aria-hidden="true"
                >
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.16-3.07-2.01 1.93c-.23.23-.42.43-.79.43z"
                    />
                  </svg>
                </span>
              </div>

              <p class="mt-4 flex-1 text-sm leading-6 text-gray-700">{{ bot.purpose }}</p>
              <p class="mt-5 rounded-2xl bg-gray-50 px-4 py-3 font-mono text-sm text-gray-800">
                {{ bot.handle }}
              </p>
              <a
                [href]="bot.url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-primary mt-5 w-full justify-center bg-[#229ed9] hover:bg-[#1d8ec3]"
              >
                Open {{ bot.title }}
              </a>
            </article>
          }
        </div>

        <section class="mx-auto mt-10 max-w-6xl">
          <h2 class="text-2xl font-bold text-gray-950">Groups and community links</h2>
          <div class="mt-5 grid gap-5 md:grid-cols-2">
            @for (group of telegram.GROUPS; track group.key) {
              <article class="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                <p class="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  {{ group.audience }}
                </p>
                <h3 class="mt-2 text-xl font-bold text-gray-950">{{ group.title }}</h3>
                <p class="mt-3 text-sm leading-6 text-gray-700">{{ group.purpose }}</p>
                <div
                  class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span class="font-mono text-sm text-gray-800">{{ group.handle }}</span>
                  <a
                    [href]="group.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-outline btn-sm justify-center"
                  >
                    Join group
                  </a>
                </div>
              </article>
            }

            <article class="rounded-3xl border border-gray-200 bg-gray-50 p-6">
              <h3 class="text-xl font-bold text-gray-950">Safety note</h3>
              <p class="mt-3 text-sm leading-6 text-gray-700">
                Telegram is useful for quick access, reminders, and community support. For private
                clinical records, payments, and sensitive documents, use the Hope Hub web app or the
                official admin/provider dashboards.
              </p>
              <a routerLink="/community" class="btn-outline btn-sm mt-5 justify-center">
                View community page
              </a>
            </article>
          </div>
        </section>
      </section>
    </main>
  `,
})
export class TelegramComponent {
  readonly telegram = APP_CONSTANTS.TELEGRAM;
}
