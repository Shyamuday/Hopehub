import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  buildQrImageUrl,
  fallbackDownloadLinks,
  patientAppLandingUrl,
  type PatientAppDownloadLinks
} from '../../core/constants/app-download.constants';

@Component({
  selector: 'app-download-qr',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-download-qr.component.html',
  styleUrl: './app-download-qr.component.scss'
})
export class AppDownloadQrComponent implements OnInit {
  private readonly http = inject(HttpClient);

  /** compact = smaller card for dashboard sidebars */
  readonly compact = input(false);
  readonly title = input('Download the patient app');
  readonly subtitle = input(
    'No account needed to install. Scan to get the app, then sign up when you are ready.'
  );

  readonly links = signal<PatientAppDownloadLinks>(fallbackDownloadLinks());
  readonly qrUrl = signal(buildQrImageUrl(patientAppLandingUrl()));

  ngOnInit(): void {
    void this.loadLinks();
  }

  private async loadLinks(): Promise<void> {
    try {
      const info = await firstValueFrom(
        this.http.get<PatientAppDownloadLinks>(`${environment.apiUrl}/app/download`)
      );
      this.links.set(info);
      this.qrUrl.set(buildQrImageUrl(info.landingUrl));
    } catch {
      const fallback = fallbackDownloadLinks();
      this.links.set(fallback);
      this.qrUrl.set(buildQrImageUrl(fallback.landingUrl));
    }
  }
}
