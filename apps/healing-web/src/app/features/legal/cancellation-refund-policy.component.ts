import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../core';

@Component({
  selector: 'app-cancellation-refund-policy',
  standalone: true,
  imports: [RouterModule],
  template: `
    <main class="bg-white">
      <section class="border-b border-slate-200 bg-slate-50 py-12 sm:py-16">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
          <p class="text-sm font-semibold uppercase text-teal-700">Legal</p>
          <h1 class="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
            Cancellation & Refund Policy
          </h1>
          <p class="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            This policy explains cancellations, rescheduling, and refunds for Hope Hub support
            sessions booked through hopehub.in.
          </p>
          <p class="mt-3 text-sm text-slate-600">Effective date: July 24, 2026</p>
        </div>
      </section>

      <section class="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl space-y-8 text-slate-700">
          <section>
            <h2 class="text-xl font-bold text-slate-950">Session Fee</h2>
            <p class="mt-3 leading-7">
              Hope Hub introductory support sessions are priced at INR 500 for a 30-minute
              consultation unless a different amount is clearly shown before payment.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Cancellation Before Confirmation</h2>
            <p class="mt-3 leading-7">
              If your requested slot or provider has not yet been confirmed, you may ask us to
              cancel the request. If payment was already collected and the session cannot be
              confirmed, we will offer a reschedule or refund.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Rescheduling</h2>
            <p class="mt-3 leading-7">
              You may request rescheduling before the confirmed session time. Rescheduling depends
              on provider availability. Please contact us as early as possible using the contact
              details below.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Refund Eligibility</h2>
            <p class="mt-3 leading-7">
              Refunds may be considered if the session was paid for but not delivered due to Hope
              Hub or provider-side unavailability, duplicate payment, or a technical/payment error.
              Sessions that have already started or been completed are generally not refundable.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Refund Timeline</h2>
            <p class="mt-3 leading-7">
              Approved refunds are initiated to the original payment method. Bank/payment gateway
              timelines may vary, but refunds commonly take 5-7 working days after initiation.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Payment Verification & Tracking</h2>
            <p class="mt-3 leading-7">
              Online payments are verified securely with our payment gateway before a session is
              marked as paid. Failed, cancelled, duplicate, and refund events are logged against the
              original booking so our support team can review the status and help you retry or
              resolve the payment.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Contact For Refunds</h2>
            <p class="mt-3 leading-7">
              For cancellation, reschedule, or refund support, email
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
export class CancellationRefundPolicyComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;
}
