import { Component, Input } from '@angular/core';

export type CheckoutSummaryRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

export type CheckoutSummaryNotice = {
  title: string;
  message?: string;
};

@Component({
  selector: 'app-checkout-summary',
  standalone: true,
  templateUrl: './checkout-summary.component.html',
  styleUrl: './checkout-summary.component.scss',
})
export class CheckoutSummaryComponent {
  @Input() showSummary = true;
  @Input() eyebrow = 'Checkout';
  @Input() title = 'Hope Hub session';
  @Input() rows: CheckoutSummaryRow[] = [];
  @Input() notices: CheckoutSummaryNotice[] = [];
  @Input() includes: string[] = [];
  @Input() reassurance: string[] = [
    '🔒 Private and secure checkout',
    'Support can help with reschedule requests',
    'Refund or coupon rules are applied before confirmation',
  ];
}
