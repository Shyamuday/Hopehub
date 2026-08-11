import { booleanAttribute, Component, Input } from '@angular/core';

type PageHeaderAlign = 'left' | 'center';
type PageHeaderLevel = 1 | 2 | 3;

@Component({
  selector: 'app-page-header',
  standalone: true,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() description = '';
  @Input() align: PageHeaderAlign = 'center';
  @Input() level: PageHeaderLevel = 2;
  @Input({ transform: booleanAttribute }) compact = false;
}
