import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type StatusChipTone =
  'neutral' | 'success' | 'brand' | 'warning' | 'muted' | 'info' | 'danger';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [CommonModule],
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
}
