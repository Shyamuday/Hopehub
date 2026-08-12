import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppButtonComponent } from '../app-button/app-button.component';
import { AppModalComponent } from '../app-modal/app-modal.component';

export type PaymentFlowState =
  'IDLE' | 'CREATING_ORDER' | 'OPENING_CHECKOUT' | 'VERIFYING' | 'SUCCESS' | 'ERROR';

@Component({
  selector: 'app-payment-status-overlay',
  standalone: true,
  imports: [AppButtonComponent, AppModalComponent],
  template: `
    @if (state !== 'IDLE') {
      <app-modal
        [open]="true"
        [showClose]="state === 'SUCCESS' || state === 'ERROR'"
        [closeOnBackdrop]="state === 'SUCCESS' || state === 'ERROR'"
        labelledBy="paymentStatusTitle"
        (closed)="close.emit()"
      >
        <div class="text-center">
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
                <app-button size="sm" (click)="retry.emit()"> Retry payment </app-button>
              }
              <app-button variant="secondary" size="sm" (click)="close.emit()"> Close </app-button>
            </div>
          }
        </div>
      </app-modal>
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
