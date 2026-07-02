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
  templateUrl: './prescription-history.component.html'
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
