import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CONSUMER_UX_COPY } from '../../core/constants/consumer-ux-copy.constants';
import { AppButtonComponent } from '../../shared/components';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterModule, AppButtonComponent],
  template: `
    <main class="min-h-screen bg-[var(--brand-surface)]">
      <section class="border-b border-gray-200">
        <div class="container mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div class="mx-auto max-w-3xl text-center">
            <p
              class="hope-eyebrow mx-auto mb-4 inline-flex rounded-md border border-gray-200 bg-white px-4 py-2 shadow-sm"
            >
              About Hope Hub
            </p>
            <h1 class="text-3xl font-semibold text-gray-950 sm:text-5xl">
              Calm support for people who need a safe first step
            </h1>
            <p class="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-700 sm:text-lg">
              Hope Hub is a mental wellness support platform focused on accessible, privacy-aware,
              and practical guidance for everyday emotional challenges.
            </p>
          </div>
        </div>
      </section>

      <section class="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div class="grid gap-6 lg:grid-cols-3">
          <article class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 class="text-2xl font-semibold text-gray-950">Who We Are</h2>
            <p class="mt-4 text-sm leading-7 text-gray-700 sm:text-base">
              We are building Hope Hub as a supportive bridge between self-help resources, community
              care, and professional mental wellness support. Our focus is not to make people feel
              like they must immediately book support. Our first goal is to help someone feel less
              alone, understand what they are experiencing, and choose the next step that feels
              right.
            </p>
            <p class="mt-4 text-sm leading-7 text-gray-700 sm:text-base">
              Hope Hub currently offers mental health assessments, guided exercises, lifestyle
              resources, articles, anonymous-friendly community support, and bookable 30-minute
              expert support sessions.
            </p>
          </article>

          <aside class="rounded-lg border border-primary-100 bg-primary-50 p-6 shadow-sm">
            <h2 class="text-xl font-semibold text-gray-950">Our Vision</h2>
            <p class="mt-4 text-sm leading-7 text-gray-800">
              To make emotional support easier to access, less intimidating to start, and more
              respectful of privacy, especially for people who hesitate because they fear judgment
              or identity exposure.
            </p>
          </aside>
        </div>

        <div class="mt-6 grid gap-6 md:grid-cols-3">
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-950">What We Do</h3>
            <ul class="mt-4 space-y-3 text-sm leading-6 text-gray-700">
              <li>Offer self-assessments for reflection and early awareness.</li>
              <li>Share practical exercises, articles, and lifestyle guidance.</li>
              <li>Run anonymous-friendly community spaces through Telegram.</li>
              <li>Route session bookings to suitable Hope Hub experts.</li>
            </ul>
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-950">What We Believe</h3>
            <ul class="mt-4 space-y-3 text-sm leading-6 text-gray-700">
              <li>Support should feel calm, not clinical-first or frightening.</li>
              <li>Privacy matters, especially in mental health conversations.</li>
              <li>Small steps can still be meaningful steps.</li>
              <li>People deserve clarity before they pay for support.</li>
            </ul>
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-950">How We Help</h3>
            <ul class="mt-4 space-y-3 text-sm leading-6 text-gray-700">
              <li>Start with resources or a quick mental wellness test.</li>
              <li>Join the daily 9 PM Telegram voice circle.</li>
              <li>Book a 30-minute expert support session when needed.</li>
              <li>Track private bookings and next steps in your account.</li>
            </ul>
          </div>
        </div>

        <section class="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 class="text-2xl font-semibold text-gray-950">Clear roles, safer decisions</h2>
          <div class="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <h3 class="font-semibold text-gray-950">Peer supporters and listeners</h3>
              <p class="mt-2 text-sm leading-6 text-gray-700">
                Offer listening, encouragement, and lived-experience support. They do not diagnose,
                prescribe, or represent themselves as clinicians.
              </p>
            </div>
            <div>
              <h3 class="font-semibold text-gray-950">Professional care providers</h3>
              <p class="mt-2 text-sm leading-6 text-gray-700">
                Provider profiles identify the role and information available to Hope Hub. Users
                should review a provider’s qualifications and choose care appropriate to their need.
              </p>
            </div>
            <div>
              <h3 class="font-semibold text-gray-950">Educational content</h3>
              <p class="mt-2 text-sm leading-6 text-gray-700">
                Articles explain general mental wellness topics and link to supporting sources. Read
                our
                <a class="font-semibold text-primary-700 underline" routerLink="/editorial-policy"
                  >editorial policy</a
                >
                for authorship, review, corrections, and safety standards.
              </p>
            </div>
          </div>
        </section>

        <div
          class="mt-8 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8"
        >
          <h2 class="text-2xl font-semibold text-gray-950">Need support now?</h2>
          <p class="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-700 sm:text-base">
            You can start with a self-assessment, join the community, or book a private support
            session. Hope Hub is not an emergency service; if you are in immediate danger, contact
            local emergency services.
          </p>
          <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <app-button routerLink="/assessments" variant="outline" size="sm">{{
              UX.cta.startTest
            }}</app-button>
            <app-button routerLink="/community" variant="outline" size="sm"
              >Join community</app-button
            >
            <app-button routerLink="/contact" size="sm">{{ UX.cta.bookSupport }}</app-button>
          </div>
        </div>
      </section>
    </main>
  `,
})
export class AboutComponent {
  readonly UX = CONSUMER_UX_COPY;
}
