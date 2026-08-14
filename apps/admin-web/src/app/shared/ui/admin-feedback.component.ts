import { Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  template: `
    <div class="feedback" aria-live="polite" aria-atomic="true">
      @if (error()) {
        <div class="feedback__message feedback__message--error" role="alert">
          <span aria-hidden="true">!</span>
          <p>{{ error() }}</p>
        </div>
      }
      @if (success()) {
        <div class="feedback__message feedback__message--success" role="status">
          <span aria-hidden="true">✓</span>
          <p>{{ success() }}</p>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }
    .feedback {
      display: grid;
      gap: 0.6rem;
    }
    .feedback:empty {
      display: none;
    }
    .feedback__message {
      display: grid;
      grid-template-columns: 1.6rem minmax(0, 1fr);
      gap: 0.55rem;
      align-items: start;
      border: 1px solid;
      border-radius: 10px;
      padding: 0.7rem 0.8rem;
      font-size: 0.84rem;
      font-weight: 750;
    }
    .feedback__message span {
      display: inline-grid;
      width: 1.4rem;
      height: 1.4rem;
      place-items: center;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 900;
    }
    .feedback__message p {
      margin: 0.08rem 0 0;
      line-height: 1.45;
    }
    .feedback__message--error {
      border-color: #fecaca;
      background: #fef2f2;
      color: #991b1b;
    }
    .feedback__message--error span {
      background: #fee2e2;
      color: #b91c1c;
    }
    .feedback__message--success {
      border-color: #a7f3d0;
      background: #ecfdf5;
      color: #065f46;
    }
    .feedback__message--success span {
      background: #d1fae5;
      color: #047857;
    }
  `,
})
export class AdminFeedbackComponent {
  readonly success = input('');
  readonly error = input('');
}
