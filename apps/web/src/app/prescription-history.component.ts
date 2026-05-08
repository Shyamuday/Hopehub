import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { type Prescription } from './interfaces';
import { environment } from '../environments/environment';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-prescription-history',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .rx-card { display: flex; justify-content: space-between; align-items: flex-start; gap: .5rem; flex-wrap: wrap; }
    .rx-info { flex: 1; min-width: 0; }
    .rx-actions { display: flex; gap: .4rem; flex-shrink: 0; }
    .btn-pdf {
      background: #dbeafe; color: #1e40af; border: none; border-radius: 8px;
      padding: .3rem .75rem; font-size: .78rem; font-weight: 600; cursor: pointer;
      white-space: nowrap;
      &:hover { background: #bfdbfe; }
    }
  `],
  template: `
    <div class="panel">
      <h2>Prescription History</h2>
      <div class="cards">
        @for (prescription of prescriptions; track prescription.id) {
          <article class="consult-card">
            <div class="rx-card">
              <div class="rx-info">
                <strong>{{ prescription.diagnosis || 'Prescription' }} (v{{ prescription.version || 1 }})</strong>
                <span>{{ prescription.createdAt | date: 'mediumDate' }}</span>
                <small>{{ prescription.method || 'Method not specified' }}</small>
                @if (prescription.items?.length) {
                  <p class="muted">{{ prescription.items?.length }} medicine(s)</p>
                }
                @if (prescription.followUpDate) {
                  <p class="muted">Follow-up: {{ prescription.followUpDate | date: 'mediumDate' }}</p>
                }
              </div>
              <div class="rx-actions">
                <button class="btn-pdf" type="button" (click)="downloadPdf(prescription.id)">
                  &#x21E9; PDF
                </button>
              </div>
            </div>
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
  private readonly auth = inject(AuthService);

  async downloadPdf(prescriptionId: string) {
    const token = this.auth.token;
    const url = `${environment.apiUrl}/patient/prescriptions/${prescriptionId}/pdf`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `vitalis-prescription-${prescriptionId.slice(0, 8)}.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  }
}
