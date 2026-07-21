import { Component, Input, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CLINIC_API_BASE_URL } from '@hopehub/clinic-api';

export type PatientIdCardData = {
  patientCode: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  clinic?: { id: string; name: string; code: string; address?: string | null } | null;
  issuedAt?: string;
  scanUrl?: string;
};

@Component({
  selector: 'hopehub-patient-id-card-display',
  imports: [DatePipe],
  templateUrl: './patient-id-card-display.component.html',
  styleUrl: './patient-id-card-display.component.scss'
})
export class PatientIdCardDisplayComponent {
  private readonly apiBase = inject(CLINIC_API_BASE_URL);

  @Input({ required: true }) card!: PatientIdCardData;
  @Input() compact = false;

  get scanUrl(): string {
    return this.card.scanUrl ?? `${this.apiBase}/go/p/${encodeURIComponent(this.card.patientCode)}`;
  }

  get qrImageUrl(): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(this.scanUrl)}`;
  }

  print() {
    document.body.classList.add('printing-patient-card');
    window.print();
    window.setTimeout(() => document.body.classList.remove('printing-patient-card'), 500);
  }
}
