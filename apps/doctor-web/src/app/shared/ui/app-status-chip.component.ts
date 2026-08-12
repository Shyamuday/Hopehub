import { Component, Input } from '@angular/core';

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  template: `<span class="status-chip" [class]="'status-chip status-chip--' + tone"
    ><ng-content />{{ label }}</span
  >`,
  styles: [
    `
      .status-chip {
        align-items: center;
        border: 1px solid var(--color-border);
        border-radius: 999px;
        display: inline-flex;
        font-size: 0.72rem;
        font-weight: 600;
        gap: 0.25rem;
        line-height: 1;
        padding: 0.28rem 0.5rem;
      }
      .status-chip--neutral {
        background: #fafafa;
        color: var(--color-text-secondary);
      }
      .status-chip--info {
        background: var(--color-brand-soft);
        border-color: var(--color-brand-muted);
        color: var(--color-brand-dark);
      }
      .status-chip--success {
        background: var(--color-success-bg);
        border-color: var(--color-success-border);
        color: var(--color-success);
      }
      .status-chip--warning {
        background: var(--color-warning-bg);
        border-color: var(--color-warning-border);
        color: var(--color-warning);
      }
      .status-chip--danger {
        background: var(--color-error-bg);
        border-color: var(--color-error-border);
        color: var(--color-error);
      }
    `,
  ],
})
export class AppStatusChipComponent {
  @Input() label = '';
  @Input() tone: StatusTone = 'neutral';
}
