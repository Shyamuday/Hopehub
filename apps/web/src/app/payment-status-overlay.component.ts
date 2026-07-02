import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type PaymentFlowState = 'IDLE' | 'CREATING_ORDER' | 'OPENING_CHECKOUT' | 'VERIFYING' | 'SUCCESS' | 'ERROR';

@Component({
  selector: 'app-payment-status-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-status-overlay.component.html'
})
export class PaymentStatusOverlayComponent {
  @Input() state: PaymentFlowState = 'IDLE';
  @Input() title = '';
  @Input() message = '';
  @Input() canRetry = false;

  @Output() retry = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
}
