import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="stats">
      <div class="panel">
        <span>Total revenue</span>
        <strong>{{ revenueInPaise / 100 | currency: 'INR' }}</strong>
      </div>
      <div class="panel">
        <span>Active doctors</span>
        <strong>{{ activeDoctors }}</strong>
      </div>
      <div class="panel">
        <span>Consultations</span>
        <strong>{{ consultationsCount }}</strong>
      </div>
    </section>
  `
})
export class AdminStatsComponent {
  @Input() revenueInPaise = 0;
  @Input() activeDoctors = 0;
  @Input() consultationsCount = 0;
}
