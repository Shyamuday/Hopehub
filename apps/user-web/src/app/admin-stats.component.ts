import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './admin-stats.component.html',
})
export class AdminStatsComponent {
  @Input() revenueInPaise = 0;
  @Input() activeDoctors = 0;
  @Input() consultationsCount = 0;
}
