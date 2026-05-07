import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type PaymentFlowState = 'IDLE' | 'CREATING_ORDER' | 'OPENING_CHECKOUT' | 'VERIFYING' | 'SUCCESS' | 'ERROR';

@Component({
  selector: 'app-payment-status-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (state !== 'IDLE') {
      <section class="process-overlay">
        <article class="process-card">
          @if (state === 'CREATING_ORDER' || state === 'OPENING_CHECKOUT' || state === 'VERIFYING') {
            <span class="spinner"></span>
          } @else if (state === 'SUCCESS') {
            <span class="status-icon success-icon">✓</span>
          } @else if (state === 'ERROR') {
            <span class="status-icon error-icon">!</span>
          }

          <h3>{{ title }}</h3>
          <p class="muted">{{ message }}</p>

          @if (state === 'SUCCESS' || state === 'ERROR') {
            <div class="actions">
              @if (state === 'ERROR' && canRetry) {
                <button class="primary" type="button" (click)="retry.emit()">Retry payment</button>
              }
              <button class="secondary" type="button" (click)="close.emit()">Close</button>
            </div>
          }
        </article>
      </section>
    }
  `
})
export class PaymentStatusOverlayComponent {
  @Input() state: PaymentFlowState = 'IDLE';
  @Input() title = '';
  @Input() message = '';
  @Input() canRetry = false;

  @Output() retry = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
}
