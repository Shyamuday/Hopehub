import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-coupon-box',
  standalone: true,
  templateUrl: './coupon-box.component.html',
  styleUrl: './coupon-box.component.scss',
})
export class CouponBoxComponent {
  @Input() value = '';
  @Input() title = 'Have a coupon?';
  @Input() subtitle = 'Apply it at secure checkout';
  @Input() placeholder = 'Coupon code';
  @Input() applyLabel = 'Apply coupon';
  @Input() checkingLabel = 'Checking...';
  @Input() loading = false;
  @Input() applied = false;
  @Input() disabled = false;
  @Input() error = '';
  @Input() helper = '';
  @Input() success = '';
  @Input() showClear = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() apply = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  normalizedValue(): string {
    return String(this.value || '').trim();
  }

  canApply(): boolean {
    return !this.loading && !this.disabled && Boolean(this.normalizedValue());
  }
}
