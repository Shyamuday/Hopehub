import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (open) {
      <div class="confirm-backdrop" (click)="cancel.emit()"></div>
      <section class="confirm-dialog" role="dialog" aria-modal="true" [attr.aria-label]="title">
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
        <div>
          <button type="button" class="cancel" (click)="cancel.emit()">{{ cancelLabel }}</button
          ><button type="button" [class.danger]="danger" (click)="confirm.emit()">
            {{ confirmLabel }}
          </button>
        </div>
      </section>
    }
  `,
  styles: [
    `
      .confirm-backdrop {
        background: rgba(0, 0, 0, 0.34);
        inset: 0;
        position: fixed;
        z-index: 90;
      }
      .confirm-dialog {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-md);
        left: 50%;
        max-width: min(28rem, calc(100vw - 2rem));
        padding: 1.25rem;
        position: fixed;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        z-index: 91;
      }
      h2 {
        font-size: var(--text-lg);
        margin: 0;
      }
      p {
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
        line-height: var(--leading-relaxed);
        margin: 0.55rem 0 1rem;
      }
      div {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      button {
        background: var(--color-brand);
        border: 1px solid var(--color-brand);
        border-radius: var(--radius-sm);
        color: #fff;
        font: inherit;
        font-size: var(--text-sm);
        font-weight: 600;
        min-height: 2.4rem;
        padding: 0.5rem 0.75rem;
      }
      .cancel {
        background: #fff;
        border-color: var(--color-border-strong);
        color: var(--color-text-secondary);
      }
      button.danger {
        background: var(--color-error);
        border-color: var(--color-error);
      }
    `,
  ],
})
export class AppConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() danger = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
