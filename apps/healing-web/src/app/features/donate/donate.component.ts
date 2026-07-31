import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, PaymentService } from '../../core/services';

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[var(--brand-surface)]">
      <!-- Hero -->
      <section class="px-4 py-12 text-center sm:py-16">
        <div class="mx-auto max-w-3xl">
          <p
            class="hope-eyebrow mx-auto mb-4 inline-flex rounded-md border border-gray-200 bg-white px-4 py-2 shadow-sm"
          >
            Community supported mental wellness
          </p>
          <h1 class="mb-4 text-3xl font-semibold text-gray-950 sm:text-4xl">Support Hope Hub</h1>
          <p class="text-base leading-7 text-gray-700 sm:text-lg">
            Your contribution helps us keep mental health support accessible to everyone. Every
            rupee goes directly toward maintaining free resources, community programs, and helping
            people who can't afford professional care.
          </p>
        </div>
      </section>

      <!-- Why Donate -->
      <section class="px-4 py-6">
        <div class="mx-auto mb-12 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
          <div class="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
            <h3 class="mb-2 font-semibold text-gray-950">Free Resources</h3>
            <p class="text-sm leading-6 text-gray-700">
              Keep exercises, assessments, and articles free for everyone
            </p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
            <h3 class="mb-2 font-semibold text-gray-950">Community Programs</h3>
            <p class="text-sm leading-6 text-gray-700">
              Fund group support and guided community sessions
            </p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
            <h3 class="mb-2 font-semibold text-gray-950">Platform Growth</h3>
            <p class="text-sm leading-6 text-gray-700">
              Help us build more tools and reach more people in need
            </p>
          </div>
        </div>
      </section>

      <!-- Donate Section -->
      <section class="px-4 pb-20 pt-6">
        <div class="mx-auto max-w-2xl">
          <!-- UPI Card -->
          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <!-- Card Header -->
            <div class="border-b border-gray-200 px-6 py-5 text-center sm:px-8">
              <h2 class="mb-1 text-2xl font-semibold text-gray-950">Donate Securely</h2>
              <p class="text-sm text-gray-600">
                Pay with UPI or Razorpay-supported payment methods
              </p>
            </div>

            <!-- QR Code -->
            <div class="flex flex-col items-center px-6 pb-4 pt-8 sm:px-8">
              <p class="mb-4 text-center text-sm text-gray-600">
                Scan with BHIM, GPay, PhonePe, Paytm or any UPI app
              </p>
              <div class="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                <img
                  src="/image/upiqr.jpg"
                  alt="BHIM UPI QR Code"
                  class="w-56 h-56 object-contain rounded-xl"
                />
              </div>
            </div>

            <!-- UPI ID -->
            <div class="px-6 py-6 sm:px-8">
              <p class="mb-3 text-center text-sm text-gray-600">Or pay directly using UPI ID</p>
              <div
                class="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span class="break-all font-mono text-base font-semibold text-gray-800 sm:text-lg"
                  >9304471227&#64;upi</span
                >
                <button (click)="copyUpiId()" class="btn-outline btn-sm">
                  @if (copied()) {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Copied!
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  }
                </button>
              </div>
            </div>

            <!-- Suggested Amounts -->
            <div class="px-6 pb-6 sm:px-8">
              <p class="mb-3 text-center text-sm text-gray-600">Suggested amounts</p>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-5">
                @for (amount of amounts; track amount) {
                  <button
                    (click)="selectAmount(amount)"
                    [class]="
                      selectedAmount() === amount
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary-500 hover:text-primary-700'
                    "
                    class="rounded-md border py-2 text-sm font-semibold transition-colors"
                  >
                    ₹{{ amount }}
                  </button>
                }
              </div>
            </div>

            <div class="px-6 pb-6 sm:px-8">
              <button
                type="button"
                (click)="paySelectedAmount()"
                [disabled]="!selectedAmount() || isPaying()"
                class="btn-primary btn-block btn-sm"
              >
                @if (isPaying()) {
                  Opening secure payment...
                } @else if (selectedAmount()) {
                  Donate ₹{{ selectedAmount() }} Securely
                } @else {
                  Select an amount to donate
                }
              </button>

              @if (paymentMessage()) {
                <p
                  class="mt-3 rounded-lg px-3 py-2 text-center text-sm"
                  [class]="
                    paymentSuccess() ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  "
                >
                  {{ paymentMessage() }}
                </p>
              }
            </div>

            <!-- Note -->
            <div class="px-6 pb-8 sm:px-8">
              <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                <p class="text-sm leading-6 text-gray-700">
                  After payment, you can message us on
                  <a
                    href="https://t.me/mindhopehub"
                    target="_blank"
                    rel="noopener"
                    class="font-semibold underline"
                    >Telegram</a
                  >
                  or
                  <a
                    href="https://chat.whatsapp.com/CbbNoo5kXw3FWWKTGO82kz"
                    target="_blank"
                    rel="noopener"
                    class="font-semibold underline"
                    >WhatsApp</a
                  >
                  with your transaction ID. Thank you for your support.
                </p>
              </div>
            </div>
          </div>

          <!-- Transparency note -->
          <div
            class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-center text-xs leading-6 text-gray-600"
          >
            Hope Hub is a community-driven initiative. All donations are used solely for platform
            maintenance and community programs.
            <div class="mt-2 flex flex-wrap justify-center gap-3">
              <a
                class="font-semibold text-primary-700 hover:text-primary-800"
                href="/payment-policy"
                >Payment Policy</a
              >
              <a
                class="font-semibold text-primary-700 hover:text-primary-800"
                href="/cancellation-refund-policy"
                >Refund Policy</a
              >
              <a class="font-semibold text-primary-700 hover:text-primary-800" href="/contact"
                >Contact Support</a
              >
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class DonateComponent {
  private paymentService = inject(PaymentService);
  private notificationService = inject(NotificationService);

  readonly amounts = [51, 101, 251, 501, 1001, 2101, 5001, 11000, 21000, 51000];
  selectedAmount = signal<number | null>(null);
  copied = signal(false);
  isPaying = signal(false);
  paymentMessage = signal('');
  paymentSuccess = signal(false);

  selectAmount(amount: number): void {
    this.selectedAmount.set(amount);
  }

  copyUpiId(): void {
    navigator.clipboard.writeText('9304471227@upi').then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  async paySelectedAmount(): Promise<void> {
    const amount = this.selectedAmount();
    if (!amount || this.isPaying()) return;

    this.isPaying.set(true);
    this.paymentMessage.set('');
    this.paymentSuccess.set(false);

    try {
      await this.paymentService.donate({ amount });
      this.paymentSuccess.set(true);
      this.paymentMessage.set('Thank you. Your donation payment was verified successfully.');
      this.notificationService.success('Thank you. Your donation payment was verified.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment could not be completed.';
      this.paymentSuccess.set(false);
      this.paymentMessage.set(message);
      this.notificationService.error(message);
    } finally {
      this.isPaying.set(false);
    }
  }
}
