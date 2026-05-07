import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Prescription } from './models';

@Component({
  selector: 'app-prescription-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel">
      <h2>Prescription History</h2>
      <div class="cards">
        @for (prescription of prescriptions; track prescription.id) {
          <article class="consult-card">
            <strong>{{ prescription.diagnosis || 'Prescription' }} (v{{ prescription.version || 1 }})</strong>
            <span>{{ prescription.createdAt | date: 'medium' }}</span>
            <small>{{ prescription.method || 'Method not specified' }}</small>
            @if (prescription.items?.length) {
              <p class="muted">Medicines: {{ prescription.items?.length }}</p>
            }
          </article>
        } @empty {
          <p class="muted">No prescriptions published yet.</p>
        }
      </div>
    </div>
  `
})
export class PrescriptionHistoryComponent {
  @Input() prescriptions: Prescription[] = [];
}
