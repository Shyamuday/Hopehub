import { Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-content-state',
  standalone: true,
  template: `
    @if (loading()) {
      <div class="state state--loading" role="status">
        <i aria-hidden="true"></i>
        <span>{{ loadingLabel() }}</span>
      </div>
    } @else if (empty()) {
      <div class="state state--empty">
        <strong>{{ emptyTitle() }}</strong>
        @if (emptyMessage()) {
          <span>{{ emptyMessage() }}</span>
        }
      </div>
    }
  `,
  styles: `
    .state {
      display: grid;
      place-items: center;
      gap: 0.45rem;
      min-height: 7rem;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      background: #f8fafc;
      padding: 1rem;
      text-align: center;
    }
    .state span {
      color: #64748b;
      font-size: 0.82rem;
    }
    .state strong {
      color: #334155;
      font-size: 0.92rem;
    }
    .state--loading {
      grid-template-columns: auto auto;
      place-content: center;
    }
    .state--loading i {
      width: 1rem;
      height: 1rem;
      border: 2px solid #cbd5e1;
      border-top-color: #0f766e;
      border-radius: 999px;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class AdminContentStateComponent {
  readonly loading = input(false);
  readonly empty = input(false);
  readonly loadingLabel = input('Loading…');
  readonly emptyTitle = input('Nothing here yet');
  readonly emptyMessage = input('');
}
