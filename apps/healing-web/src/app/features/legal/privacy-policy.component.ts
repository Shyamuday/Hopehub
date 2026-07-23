import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../core';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterModule],
  template: `
    <main class="bg-white">
      <section class="border-b border-slate-200 bg-slate-50 py-12 sm:py-16">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
          <p class="text-sm font-semibold uppercase text-teal-700">Legal</p>
          <h1 class="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">Privacy Policy</h1>
          <p class="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            This policy explains how Hope Hub collects, uses, and protects information shared
            through mind.hopehub.in and related support channels.
          </p>
          <p class="mt-3 text-sm text-slate-600">Effective date: July 23, 2026</p>
        </div>
      </section>

      <section class="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl space-y-8 text-slate-700">
          <section>
            <h2 class="text-xl font-bold text-slate-950">Information We Collect</h2>
            <p class="mt-3 leading-7">
              We may collect details you submit through forms, including your name, contact details,
              concern type, preferred support channel, appointment request information, feedback,
              and any message you choose to share.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">How We Use Information</h2>
            <p class="mt-3 leading-7">
              We use submitted information to respond to requests, route you to suitable support,
              manage community or consultation workflows, improve our services, and maintain safety
              and reliability.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Telegram And WhatsApp</h2>
            <p class="mt-3 leading-7">
              If you join Telegram or WhatsApp groups, those platforms may process your account
              information under their own privacy policies. Use display names and privacy settings
              carefully, and avoid sharing sensitive personal details in public groups.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Health And Emergency Limits</h2>
            <p class="mt-3 leading-7">
              Hope Hub is for supportive counselling, guidance, and mental wellness resources. It is
              not emergency care. If you are in immediate danger, contact local emergency services
              or Tele MANAS at 14416 in India.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Contact</h2>
            <p class="mt-3 leading-7">
              For privacy questions, contact us at
              <a
                class="font-semibold text-teal-700 hover:text-teal-800"
                href="mailto:{{ APP_CONSTANTS.CONTACT.EMAIL }}"
              >
                {{ APP_CONSTANTS.CONTACT.EMAIL }} </a
              >.
            </p>
          </section>
        </div>
      </section>
    </main>
  `,
})
export class PrivacyPolicyComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;
}
