import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { PatientHealthProfileComponent } from '../../../shared/patient-health-profile/patient-health-profile';

type ScanPatient = {
  id: string;
  name: string;
  patientCode?: string | null;
  mobile?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  chronicConditions?: string | null;
  homeClinicStore?: { id: string; name: string; code: string } | null;
};

type ScanConsultation = {
  id: string;
  status: string;
  createdAt: string;
  disease?: { name: string } | null;
};

type ScanResponse = {
  patient: ScanPatient;
  consultations: ScanConsultation[];
  primaryConsultationId: string | null;
};

@Component({
  selector: 'app-patient-scan-page',
  imports: [CommonModule, DatePipe, RouterLink, PatientHealthProfileComponent],
  templateUrl: './patient-scan-page.html',
  styleUrl: './patient-scan-page.scss'
})
export class PatientScanPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly scanResult = signal<ScanResponse | null>(null);
  readonly patientCode = signal('');

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('patientCode') ?? '';
    this.patientCode.set(code);
    void this.load(code);
  }

  private async load(patientCode: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await firstValueFrom(
        this.http.get<ScanResponse>(`${environment.apiUrl}/scan/patient/${encodeURIComponent(patientCode)}`)
      );
      this.scanResult.set(result);
    } catch (err: unknown) {
      const message =
        (err as { error?: { message?: string } })?.error?.message || 'Could not load patient from scan.';
      this.error.set(message);
      this.scanResult.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  openPrescribe(): void {
    const result = this.scanResult();
    if (result?.primaryConsultationId) {
      void this.router.navigate(['/', ROUTE_PATHS.APPOINTMENTS], {
        queryParams: { consultationId: result.primaryConsultationId }
      });
      return;
    }
    void this.router.navigate(['/', ROUTE_PATHS.PATIENTS]);
  }

  openPatients(): void {
    void this.router.navigate(['/', ROUTE_PATHS.PATIENTS]);
  }

  openConsultation(consultationId: string): void {
    void this.router.navigate(['/', ROUTE_PATHS.APPOINTMENTS], { queryParams: { consultationId } });
  }
}
