import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-stats.component.html'
})
export class AdminStatsComponent {
  @Input() revenueInPaise = 0;
  @Input() activeDoctors = 0;
  @Input() consultationsCount = 0;
}
