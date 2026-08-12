import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-filter-toolbar',
  standalone: true,
  template: `
    <div class="filter-toolbar">
      <label class="filter-toolbar__search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          [placeholder]="placeholder"
          [value]="query"
          (input)="queryChange.emit($any($event.target).value)"
        />
      </label>
      <div class="filter-toolbar__filters"><ng-content /></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .filter-toolbar {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
      }
      .filter-toolbar__search {
        align-items: center;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        display: flex;
        gap: 0.45rem;
        max-width: 32rem;
        padding: 0 0.65rem;
        width: min(100%, 30rem);
      }
      .filter-toolbar__search span {
        color: var(--color-text-muted);
        font-size: 1.1rem;
      }
      .filter-toolbar__search input {
        border: 0;
        box-shadow: none;
        min-height: 2.45rem;
        padding: 0;
      }
      .filter-toolbar__filters {
        display: flex;
        flex: 1;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      @media (max-width: 560px) {
        .filter-toolbar__search {
          max-width: none;
          width: 100%;
        }
      }
    `,
  ],
})
export class AppFilterToolbarComponent {
  @Input() query = '';
  @Input() placeholder = 'Search';
  @Output() queryChange = new EventEmitter<string>();
}
