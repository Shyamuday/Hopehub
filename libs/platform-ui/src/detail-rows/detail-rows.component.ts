import { Component, input } from '@angular/core';
import type { DetailRow } from './detail-rows.types';

@Component({
  selector: 'vitalis-detail-rows',
  standalone: true,
  templateUrl: './detail-rows.component.html',
  styleUrl: './detail-rows.component.scss',
  host: {
    '[class.detail-rows-panel]': "variant() === 'panel'",
    '[class.detail-rows-stat]': "variant() === 'stat'",
    '[class.detail-rows-inline-hostless]': "inlineHostless() && variant() === 'inline'"
  }
})
export class DetailRowsComponent {
  readonly rows = input.required<DetailRow[]>();
  /** `inline` → labeled paragraphs; `grid` → labeled cards; `panel` → titled panels; `stat` → h3 stat cards; `blocks` → strong + paragraph blocks. */
  readonly variant = input<'inline' | 'grid' | 'panel' | 'stat' | 'blocks'>('inline');
  readonly panelHeading = input<'h2' | 'h3'>('h2');
  readonly inlineTag = input<'p' | 'small' | 'span'>('p');
  /** Render inline rows without a wrapper (for flex/meta rows and button children). */
  readonly inlineHostless = input(false);
}
