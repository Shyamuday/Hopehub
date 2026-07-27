import { Component, EventEmitter, Input, Output } from '@angular/core';

export type PaymentFlowState =
  'IDLE' | 'CREATING_ORDER' | 'OPENING_CHECKOUT' | 'VERIFYING' | 'SUCCESS' | 'ERROR';

@Component({
  selector: 'app-payment-status-overlay',
  standalone: true,
  template: `
    @if (state !== 'IDLE') {
      <section
        class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paymentStatusTitle"
      >
        <article class="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-2xl">
          @if (
            state === 'CREATING_ORDER' || state === 'OPENING_CHECKOUT' || state === 'VERIFYING'
          ) {
            <span
              class="mx-auto mb-4 block h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600"
              aria-hidden="true"
            ></span>
          } @else if (state === 'SUCCESS') {
            <span
              class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-2xl font-bold text-green-700"
              aria-hidden="true"
            >
              ✓
            </span>
          } @else if (state === 'ERROR') {
            <span
              class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl font-bold text-red-700"
              aria-hidden="true"
            >
              !
            </span>
          }

          <h2 id="paymentStatusTitle" class="text-xl font-bold text-slate-950">{{ title }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-700">{{ message }}</p>

          @if (state === 'SUCCESS' || state === 'ERROR') {
            <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              @if (state === 'ERROR' && canRetry) {
                <button type="button" class="btn-primary btn-sm" (click)="retry.emit()">
                  Retry payment
                </button>
              }
              <button
                type="button"
                class="btn-secondary btn-sm border-slate-300 text-slate-800 hover:border-primary-500"
                (click)="close.emit()"
              >
                Close
              </button>
            </div>
          }
        </article>
      </section>
    }
  `,
})
export class PaymentStatusOverlayComponent {
  @Input() state: PaymentFlowState = 'IDLE';
  @Input() title = '';
  @Input() message = '';
  @Input() canRetry = false;

  @Output() retry = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
}
