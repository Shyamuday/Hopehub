import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';

type DeliveryLine = { label: string; qty: number };
type PatientHit = { id: string; name: string; patientCode?: string | null; mobile?: string | null };

@Component({
  selector: 'app-deliveries-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './deliveries-page.html',
  styleUrl: './deliveries-page.scss'
})
export class DeliveriesPage implements OnInit {
  private api = inject(StoreApiService);

  loading = signal(true);
  error = signal('');
  deliveries = signal<any[]>([]);
  creating = signal(false);
  toast = signal('');
  createdOtp = signal('');

  patientQuery = '';
  patientHits = signal<PatientHit[]>([]);
  selectedPatient = signal<PatientHit | null>(null);
  deliveryAddress = '';
  deliveryPhone = '';
  notes = '';
  lines = signal<DeliveryLine[]>([{ label: '', qty: 1 }]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getDeliveries().subscribe({
      next: (res) => {
        this.deliveries.set(res.deliveries ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load deliveries.');
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.creating.set(true);
    this.createdOtp.set('');
    this.selectedPatient.set(null);
    this.patientQuery = '';
    this.patientHits.set([]);
    this.deliveryAddress = '';
    this.deliveryPhone = '';
    this.notes = '';
    this.lines.set([{ label: 'Arnica Montana 30C', qty: 1 }]);
  }

  closeCreate(): void {
    this.creating.set(false);
    this.createdOtp.set('');
  }

  searchPatients(): void {
    const q = this.patientQuery.trim();
    if (q.length < 2) {
      this.patientHits.set([]);
      return;
    }
    this.api.searchPatients(q).subscribe({
      next: (res) => this.patientHits.set(res.patients ?? []),
      error: () => this.patientHits.set([])
    });
  }

  pickPatient(p: PatientHit): void {
    this.selectedPatient.set(p);
    this.deliveryPhone = p.mobile ?? '';
    this.patientHits.set([]);
    this.patientQuery = `${p.name} (${p.patientCode ?? p.id})`;
  }

  addLine(): void {
    this.lines.update((rows) => [...rows, { label: '', qty: 1 }]);
  }

  submitCreate(): void {
    const patient = this.selectedPatient();
    if (!patient) return;
    const lines = this.lines().filter((line) => line.label.trim() && line.qty > 0);
    if (!lines.length || !this.deliveryAddress.trim() || !this.deliveryPhone.trim()) return;

    this.api.postDelivery({
      patientId: patient.id,
      deliveryAddress: this.deliveryAddress.trim(),
      deliveryPhone: this.deliveryPhone.trim(),
      notes: this.notes.trim() || undefined,
      lines: lines.map((line) => ({ label: line.label.trim(), qty: line.qty }))
    }).subscribe({
      next: (res) => {
        this.createdOtp.set(res.deliveryOtp ?? '');
        this.toast.set('Delivery scheduled — share OTP with patient');
        setTimeout(() => this.toast.set(''), 3000);
        this.load();
      },
      error: (err) => {
        this.toast.set(err.error?.message || 'Create failed');
        setTimeout(() => this.toast.set(''), 3000);
      }
    });
  }
}
