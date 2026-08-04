import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../core';

@Component({
  selector: 'app-shipping-policy',
  standalone: true,
  imports: [RouterModule],
  template: `
    <main class="bg-white">
      <section class="border-b border-slate-200 bg-slate-50 py-12 sm:py-16">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
          <p class="text-sm font-semibold uppercase text-teal-700">Legal</p>
          <h1 class="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
            Service Delivery / Shipping Policy
          </h1>
          <p class="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            Hope Hub provides mental wellness support services digitally. We do not ship physical
            products for consultation bookings.
          </p>
          <p class="mt-3 text-sm text-slate-600">Effective date: July 24, 2026</p>
        </div>
      </section>

      <section class="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl space-y-8 text-slate-700">
          <section>
            <h2 class="text-xl font-bold text-slate-950">Delivery Method</h2>
            <p class="mt-3 leading-7">
              Paid Hope Hub sessions are delivered online through the support channel confirmed for
              the booking, such as web consultation, voice/video call, WhatsApp follow-up, Telegram
              follow-up, or another mutually confirmed digital channel.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Confirmation</h2>
            <p class="mt-3 leading-7">
              After a user submits a request and completes payment where required, Hope Hub reviews
              the request and confirms the suitable support path, care team availability, and
              session timing.
            </p>
            <p class="mt-3 leading-7">
              Payment confirmation depends on secure gateway verification. If payment fails or is
              cancelled, the user may retry from the booking flow or contact support for help.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Delivery Timeline</h2>
            <p class="mt-3 leading-7">
              Session timing depends on the slot selected by the user and care team availability.
              For community and contact requests, we typically respond within 24 hours.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">No Physical Shipping</h2>
            <p class="mt-3 leading-7">
              Hope Hub consultation and mental wellness services are digital services. No physical
              goods, courier tracking, or shipping charges apply to these bookings.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Support</h2>
            <p class="mt-3 leading-7">
              For service delivery questions, contact
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
export class ShippingPolicyComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;
}
