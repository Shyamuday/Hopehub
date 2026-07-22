import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../constants/api-paths.constants';
import { AUTH_TOKEN_KEY } from '../constants/auth.constants';
import { BLOB_REVOKE_MS } from '../constants/timing.constants';

@Service()
export class PrescriptionPdfService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  pdfUrl(prescriptionId: string, inline = false) {
    const query = inline ? '?disposition=inline' : '';
    return `${this.apiBase}${API_PATHS.PROVIDER.PRESCRIPTION_PDF(prescriptionId)}${query}`;
  }

  async fetchBlob(prescriptionId: string, inline = false) {
    const response = await fetch(this.pdfUrl(prescriptionId, inline), {
      headers: await this.authHeaders(),
    });
    if (!response.ok) throw new Error('Could not load prescription PDF.');
    return response.blob();
  }

  async fetchShareMeta(prescriptionId: string) {
    return firstValueFrom(
      this.http.get<{ shareText: string }>(
        `${this.apiBase}${API_PATHS.PROVIDER.PRESCRIPTION_SHARE(prescriptionId)}`,
      ),
    );
  }

  async download(prescriptionId: string) {
    const blob = await this.fetchBlob(prescriptionId);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `hopehub-prescription-${prescriptionId.slice(0, 8)}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_REVOKE_MS);
  }

  async view(prescriptionId: string) {
    const blob = await this.fetchBlob(prescriptionId, true);
    const blobUrl = URL.createObjectURL(blob);
    const tab = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!tab) {
      URL.revokeObjectURL(blobUrl);
      throw new Error('Pop-up blocked. Allow pop-ups to view the PDF.');
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_REVOKE_MS * 4);
  }

  whatsAppUrl(text: string) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  private async authHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
