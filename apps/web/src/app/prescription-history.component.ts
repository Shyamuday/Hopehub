import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { API_PATHS } from './core/constants/api-paths.constants';
import { BLOB_REVOKE_MS } from './core/constants/timing.constants';
import { Prescription } from './models';
import { environment } from '../environments/environment';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-prescription-history',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './prescription-history.component.scss',
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
    const url = `${environment.apiUrl}${API_PATHS.PATIENT.PRESCRIPTION_PDF(prescriptionId)}`;
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
    setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_REVOKE_MS);
  }
}
