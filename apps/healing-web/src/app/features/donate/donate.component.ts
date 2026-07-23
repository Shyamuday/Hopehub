import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <!-- Hero -->
      <section class="py-16 px-4 text-center">
        <div class="max-w-3xl mx-auto">
          <div
            class="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
          >
            <span class="text-4xl">💚</span>
          </div>
          <h1 class="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Support Healing Hub</h1>
          <p class="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Your contribution helps us keep mental health support accessible to everyone. Every
            rupee goes directly toward maintaining free resources, community programs, and helping
            people who can't afford professional care.
          </p>
        </div>
      </section>

      <!-- Why Donate -->
      <section class="py-8 px-4">
        <div class="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          <div class="bg-white rounded-2xl p-6 shadow-sm text-center border border-gray-100">
            <div class="text-3xl mb-3">🧘</div>
            <h3 class="font-semibold text-gray-900 mb-2">Free Resources</h3>
            <p class="text-sm text-gray-500">
              Keep exercises, assessments, and articles free for everyone
            </p>
          </div>
          <div class="bg-white rounded-2xl p-6 shadow-sm text-center border border-gray-100">
            <div class="text-3xl mb-3">👥</div>
            <h3 class="font-semibold text-gray-900 mb-2">Community Programs</h3>
            <p class="text-sm text-gray-500">Fund monthly meetups and group support sessions</p>
          </div>
          <div class="bg-white rounded-2xl p-6 shadow-sm text-center border border-gray-100">
            <div class="text-3xl mb-3">🌱</div>
            <h3 class="font-semibold text-gray-900 mb-2">Platform Growth</h3>
            <p class="text-sm text-gray-500">
              Help us build more tools and reach more people in need
            </p>
          </div>
        </div>
      </section>

      <!-- Donate Section -->
      <section class="py-8 px-4 pb-20">
        <div class="max-w-2xl mx-auto">
          <!-- UPI Card -->
          <div class="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
            <!-- Card Header -->
            <div
              class="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6 text-white text-center"
            >
              <h2 class="text-2xl font-bold mb-1">Donate via UPI</h2>
              <p class="opacity-90 text-sm">Instant · Secure · Zero fees</p>
            </div>

            <!-- QR Code -->
            <div class="px-8 pt-8 pb-4 flex flex-col items-center">
              <p class="text-gray-500 text-sm mb-4">
                Scan with BHIM, GPay, PhonePe, Paytm or any UPI app
              </p>
              <div class="border-4 border-green-500 rounded-2xl p-2 bg-white shadow-md">
                <img
                  src="/image/upiqr.jpg"
                  alt="BHIM UPI QR Code"
                  class="w-56 h-56 object-contain rounded-xl"
                />
              </div>
            </div>

            <!-- UPI ID -->
            <div class="px-8 py-6">
              <p class="text-center text-gray-500 text-sm mb-3">Or pay directly using UPI ID</p>
              <div
                class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              >
                <span class="font-mono text-gray-800 font-semibold text-lg"
                  >9304471227&#64;upi</span
                >
                <button
                  (click)="copyUpiId()"
                  class="ml-3 flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
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
            <div class="px-8 pb-6">
              <p class="text-gray-500 text-sm mb-3 text-center">Suggested amounts</p>
              <div class="grid grid-cols-5 gap-2">
                @for (amount of amounts; track amount) {
                  <button
                    (click)="selectAmount(amount)"
                    [class]="
                      selectedAmount() === amount
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:text-green-600'
                    "
                    class="border rounded-xl py-2 text-sm font-semibold transition-colors"
                  >
                    ₹{{ amount }}
                  </button>
                }
              </div>
            </div>

            <!-- Note -->
            <div class="px-8 pb-8">
              <div class="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                <p class="text-green-700 text-sm leading-relaxed">
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
                  with your transaction ID. Thank you for your generosity! 🙏
                </p>
              </div>
            </div>
          </div>

          <!-- Transparency note -->
          <p class="text-center text-gray-400 text-xs mt-6">
            Healing Hub is a community-driven initiative. All donations are used solely for platform
            maintenance and community programs.
          </p>
        </div>
      </section>
    </div>
  `,
})
export class DonateComponent {
  readonly amounts = [51, 101, 251, 501, 1001, 2101, 5001, 11000, 21000, 51000];
  selectedAmount = signal<number | null>(null);
  copied = signal(false);

  selectAmount(amount: number): void {
    this.selectedAmount.set(amount);
  }

  copyUpiId(): void {
    navigator.clipboard.writeText('9304471227@upi').then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
