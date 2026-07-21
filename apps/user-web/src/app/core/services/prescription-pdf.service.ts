import { inject, Service } from '@angular/core';
import { API_PATHS } from '../constants/api-paths.constants';
import { BLOB_REVOKE_MS } from '../constants/timing.constants';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';

export type PrescriptionPdfMeta = {
  prescriptionId: string;
  shareText: string;
  diagnosis?: string | null;
  version?: number;
  patientName?: string | null;
};

@Service()
export class PrescriptionPdfService {
  private readonly auth = inject(AuthService);
  private readonly apiBase = environment.apiUrl;

  async fetchPdfBlob(prescriptionId: string, inline = false): Promise<Blob> {
    const url = `${this.apiBase}${API_PATHS.PATIENT.PRESCRIPTION_PDF(prescriptionId)}${inline ? '?disposition=inline' : ''}`;
    const response = await fetch(url, {
      headers: this.authHeaders()
    });
    if (!response.ok) {
      throw new Error('Could not load prescription PDF.');
    }
    return response.blob();
  }

  async fetchShareMeta(prescriptionId: string): Promise<PrescriptionPdfMeta> {
    const response = await fetch(`${this.apiBase}${API_PATHS.PATIENT.PRESCRIPTION_SHARE(prescriptionId)}`, {
      headers: this.authHeaders()
    });
    if (!response.ok) {
      throw new Error('Could not load share details.');
    }
    return response.json() as Promise<PrescriptionPdfMeta>;
  }

  async download(prescriptionId: string, filename?: string) {
    const blob = await this.fetchPdfBlob(prescriptionId);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `hopehub-prescription-${prescriptionId.slice(0, 8)}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_REVOKE_MS);
  }

  async viewInBrowser(prescriptionId: string) {
    const blob = await this.fetchPdfBlob(prescriptionId, true);
    const blobUrl = URL.createObjectURL(blob);
    const tab = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!tab) {
      URL.revokeObjectURL(blobUrl);
      throw new Error('Pop-up blocked. Allow pop-ups to view the PDF.');
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_REVOKE_MS * 4);
  }

  async print(prescriptionId: string) {
    const blob = await this.fetchPdfBlob(prescriptionId, true);
    const blobUrl = URL.createObjectURL(blob);
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.src = blobUrl;
    document.body.appendChild(frame);
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(frame);
        URL.revokeObjectURL(blobUrl);
      }, BLOB_REVOKE_MS * 2);
    };
  }

  canNativeShareFiles() {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
  }

  async shareNative(prescriptionId: string, meta?: PrescriptionPdfMeta) {
    const details = meta ?? (await this.fetchShareMeta(prescriptionId));
    const blob = await this.fetchPdfBlob(prescriptionId);
    const file = new File([blob], `hopehub-prescription-${prescriptionId.slice(0, 8)}.pdf`, { type: 'application/pdf' });
    const payload = { title: 'HopeHub prescription', text: details.shareText, files: [file] };
    if (!this.canNativeShareFiles() || !navigator.canShare(payload)) {
      throw new Error('Sharing is not supported on this device.');
    }
    await navigator.share(payload);
  }

  whatsAppShareUrl(text: string) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  private authHeaders(): HeadersInit {
    const token = this.auth.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
