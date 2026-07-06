import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PatientScanPanelComponent } from './patient-scan-panel.component';
import { buildScanNavigation, storeScanPath } from './navigate';
import type { PatientScanAppKey, ScanContextResponse } from './types';

@Component({
  selector: 'vitalis-patient-scan-launcher',
  standalone: true,
  imports: [PatientScanPanelComponent],
  templateUrl: './patient-scan-launcher.component.html',
  styleUrl: './patient-scan-launcher.component.scss'
})
export class PatientScanLauncherComponent implements OnInit {
  readonly apiBase = input.required<string>();
  readonly tokenKey = input.required<string>();
  readonly app = input<PatientScanAppKey>('operations');
  readonly adminBasePath = input('admin');
  readonly storeSession = input<{ role: string } | null>(null);

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly lastPatient = signal<ScanContextResponse['patient'] | null>(null);

  ngOnInit(): void {
    const preset = this.route.snapshot.queryParamMap.get('patientCode');
    if (preset) {
      void this.openCode(preset);
    }
  }

  async openCode(raw: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    const storeStaff = this.storeSession();
    if (storeStaff) {
      const isManager = storeStaff.role === 'MANAGER';
      await this.router.navigate(storeScanPath(raw, isManager));
      this.loading.set(false);
      return;
    }

    const token = localStorage.getItem(this.tokenKey());
    if (!token) {
      this.error.set('Please sign in to scan patients.');
      this.loading.set(false);
      return;
    }

    try {
      const context = await firstValueFrom(
        this.http.get<ScanContextResponse>(
          `${this.apiBase()}/scan/context/${encodeURIComponent(raw)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      this.lastPatient.set(context.patient);

      if (context.destination.kind === 'unsupported') {
        this.error.set(context.destination.message ?? 'Scan is not available for your role.');
        return;
      }

      if (this.app() === 'doctor' && context.destination.kind === 'doctor_scan') {
        await this.router.navigate(['/', 'scan', 'patient', raw]);
        return;
      }

      const nav = buildScanNavigation({
        app: this.app(),
        destination: context.destination,
        primaryConsultationId: context.primaryConsultationId,
        adminBasePath: this.adminBasePath()
      });

      const path = nav.commands[0]?.startsWith('/') ? nav.commands : nav.commands;
      await this.router.navigate(path, { queryParams: nav.queryParams });
    } catch (err: unknown) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? 'Could not resolve patient scan.';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }
}
