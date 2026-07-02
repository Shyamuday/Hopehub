import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { environment } from '../../../../environments/environment';

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
  selector: 'app-patient-id-card',
  imports: [DatePipe],
  templateUrl: './patient-id-card.html',
  styleUrl: './patient-id-card.scss'
})
export class PatientIdCardComponent {
  @Input({ required: true }) card!: PatientIdCardData;
  @Input() compact = false;

  get scanUrl(): string {
    return this.card.scanUrl ?? `${environment.apiUrl}/go/p/${encodeURIComponent(this.card.patientCode)}`;
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
