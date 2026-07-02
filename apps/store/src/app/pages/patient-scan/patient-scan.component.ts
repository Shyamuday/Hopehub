import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreApiService } from '../../services/store-api.service';

type TodayDose = {
  id: string;
  scheduledFor: string;
  status: string;
  medicineName: string;
  strength?: string | null;
  dose?: string | null;
  frequency?: string | null;
  instructions?: string | null;
};

type ScanResponse = {
  patient: {
    id: string;
    name: string;
    patientCode?: string | null;
    mobile?: string | null;
  };
  todayDoses: TodayDose[];
  pendingCount: number;
  prescription?: {
    id: string;
    diagnosis: string;
    items: Array<{
      medicineName: string;
      strength?: string | null;
      dose?: string | null;
      frequency?: string | null;
      duration?: string | null;
      instructions?: string | null;
    }>;
  } | null;
};

@Component({
  selector: 'app-patient-scan',
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './patient-scan.component.html',
  styleUrl: './patient-scan.component.scss'
})
export class PatientScanComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(StoreApiService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly scanResult = signal<ScanResponse | null>(null);
  readonly patientCode = signal('');

  readonly markingDoseId = signal<string | null>(null);

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('patientCode') ?? '';
    this.patientCode.set(code);
    this.load(code);
  }

  private load(patientCode: string): void {
    this.loading.set(true);
    this.error.set('');
    this.api.scanPatient(patientCode).subscribe({
      next: (data) => {
        this.scanResult.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Could not load patient medicines.');
        this.scanResult.set(null);
        this.loading.set(false);
      }
    });
  }

  markGiven(doseId: string): void {
    this.markingDoseId.set(doseId);
    this.api.markDoseGiven(doseId).subscribe({
      next: () => {
        this.markingDoseId.set(null);
        this.load(this.patientCode());
      },
      error: (err) => {
        this.markingDoseId.set(null);
        this.error.set(err.error?.message || 'Could not mark dose as given.');
      }
    });
  }

  canMarkGiven(status: string): boolean {
    return status === 'PENDING' || status === 'MISSED';
  }
}
