import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../core';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [RouterModule],
  template: `
    <main class="bg-white">
      <section class="border-b border-slate-200 bg-slate-50 py-12 sm:py-16">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
          <p class="text-sm font-semibold uppercase text-teal-700">Legal</p>
          <h1 class="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">Terms of Service</h1>
          <p class="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            These terms describe the basic rules for using Hope Hub services, resources, forms, and
            community links.
          </p>
          <p class="mt-3 text-sm text-slate-600">Effective date: July 23, 2026</p>
        </div>
      </section>

      <section class="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl space-y-8 text-slate-700">
          <section>
            <h2 class="text-xl font-bold text-slate-950">Use Of Hope Hub</h2>
            <p class="mt-3 leading-7">
              Hope Hub provides mental wellness resources, community links, and request-based
              support routing. You agree to use the service respectfully and provide accurate
              information when submitting forms.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Not Emergency Or Medical Care</h2>
            <p class="mt-3 leading-7">
              Hope Hub does not replace emergency services, psychiatric crisis care, medical
              diagnosis, or treatment from licensed professionals. In urgent situations, contact
              local emergency services or Tele MANAS at 14416 in India.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Community Conduct</h2>
            <p class="mt-3 leading-7">
              Community spaces should remain respectful, supportive, and privacy-aware. Do not
              harass others, share another person's private information, or post harmful, abusive,
              illegal, or misleading content.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Appointments And Requests</h2>
            <p class="mt-3 leading-7">
              Submitting a request does not guarantee immediate availability. Provider details,
              timing, payment details, and next steps may be shared after review.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Contact</h2>
            <p class="mt-3 leading-7">
              For service questions, contact us at
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
export class TermsOfServiceComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;
}
