import { Component, Input } from '@angular/core';
import { StatusChipComponent } from '../status-chip/status-chip.component';

@Component({
  selector: 'app-booking-intent-summary',
  standalone: true,
  imports: [StatusChipComponent],
  templateUrl: './booking-intent-summary.component.html',
  styleUrl: './booking-intent-summary.component.scss',
})
export class BookingIntentSummaryComponent {
  @Input() eyebrow = 'Your selection';
  @Input() title = 'Hope Hub support';
  @Input() items: string[] = [];
}
