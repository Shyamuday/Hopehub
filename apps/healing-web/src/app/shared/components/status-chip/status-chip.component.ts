import { Component, Input } from '@angular/core';

export type StatusChipTone =
  'neutral' | 'success' | 'brand' | 'warning' | 'muted' | 'info' | 'danger';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  templateUrl: './status-chip.component.html',
  styleUrl: './status-chip.component.scss',
})
export class StatusChipComponent {
  @Input() label = '';
  @Input() icon = '';
  @Input() tone: StatusChipTone = 'neutral';
  @Input() size: 'sm' | 'md' = 'sm';
  @Input() strong = false;
  @Input() dot = false;
  @Input() customClass = '';

  cssClass(): string {
    return [
      'status-chip',
      `status-chip--${this.tone}`,
      `status-chip--${this.size}`,
      this.strong ? 'status-chip--strong' : '',
      this.customClass,
    ]
      .filter(Boolean)
      .join(' ');
  }
}
