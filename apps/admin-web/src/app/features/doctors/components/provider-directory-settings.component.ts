import { Component, input, output } from '@angular/core';
import { AdminCanDirective } from '../../../core/directives/admin-can.directive';

@Component({
  selector: 'app-provider-directory-settings',
  standalone: true,
  imports: [AdminCanDirective],
  template: `
    <section class="settings" [adminCan]="permissions()" adminCanMatch="any">
      <div class="settings__head">
        <div>
          <h2>Website directory</h2>
          <p>Public {{ providerPlural() }} limit and display order.</p>
        </div>
        <button type="button" (click)="toggle.emit()">
          {{ open() ? 'Hide settings' : 'Show settings' }}
        </button>
      </div>
      @if (open()) {
        <div class="settings__form">
          <label for="provider-list-limit">Maximum shown on {{ directoryLabel() }}</label>
          <input
            id="provider-list-limit"
            type="number"
            min="1"
            max="50"
            [value]="limit()"
            (input)="limitChange.emit($any($event.target).value)"
            [disabled]="saving()"
          />
          <button type="button" class="primary" (click)="save.emit()" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Apply' }}
          </button>
        </div>
        @if (message()) {
          <p class="settings__message">{{ message() }}</p>
        }
      }
    </section>
  `,
  styles: `
    .settings {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #fff;
      padding: 0.9rem 1rem;
    }
    .settings__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    h2,
    p {
      margin: 0;
    }
    h2 {
      color: #0f172a;
      font-size: 1rem;
    }
    p {
      margin-top: 0.2rem;
      color: #64748b;
      font-size: 0.78rem;
    }
    button,
    input {
      min-height: 2.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.5rem 0.7rem;
      font: inherit;
    }
    button {
      background: #fff;
      color: #334155;
      font-weight: 800;
    }
    .primary {
      border-color: #0f766e;
      background: #0f766e;
      color: #fff;
    }
    .settings__form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 7rem auto;
      gap: 0.65rem;
      align-items: end;
      margin-top: 0.85rem;
    }
    label {
      display: block;
      color: #475569;
      font-size: 0.78rem;
      font-weight: 800;
    }
    .settings__message {
      color: #047857;
      font-weight: 800;
    }
    @media (max-width: 640px) {
      .settings__head {
        align-items: stretch;
        flex-direction: column;
      }
      .settings__form {
        grid-template-columns: 1fr;
      }
      .settings__head button,
      .settings__form input,
      .settings__form button {
        width: 100%;
      }
    }
  `,
})
export class ProviderDirectorySettingsComponent {
  readonly permissions = input.required<readonly string[]>();
  readonly providerPlural = input.required<string>();
  readonly directoryLabel = input.required<string>();
  readonly open = input(false);
  readonly limit = input('12');
  readonly saving = input(false);
  readonly message = input('');
  readonly toggle = output<void>();
  readonly limitChange = output<string>();
  readonly save = output<void>();
}
