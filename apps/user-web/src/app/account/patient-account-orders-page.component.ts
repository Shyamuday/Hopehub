import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClinicHttpClient } from '@hopehub/clinic-api';
import { API_PATHS } from '../core/constants/api-paths.constants';
import { AuthService } from '../auth/auth.service';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Order placed',
  ASSIGNED: 'Preparing',
  OUT_FOR_DELIVERY: 'On the way',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

type DeliveryRow = {
  id: string;
  deliveryNumber: string;
  status: string;
  deliveryAddress: string;
  deliveryPhone: string;
  createdAt: string;
  deliveredAt?: string | null;
  store?: { name: string; code: string } | null;
  lines?: Array<{ label: string; qty: number }>;
  totals?: { lineCount: number; itemCount: number };
};

@Component({
  selector: 'app-patient-account-orders-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-account-orders-page.component.html',
  styleUrl: './patient-account-orders-page.component.scss',
})
export class PatientAccountOrdersPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly http = inject(ClinicHttpClient);

  readonly loading = signal(true);
  readonly deliveries = signal<DeliveryRow[]>([]);
  readonly statusLabel = STATUS_LABELS;

  ngOnInit() {
    void this.load();
  }

  private async load() {
    try {
      if (!this.auth.token) return;
      const data = await this.http.get<{ deliveries?: DeliveryRow[] }>(
        API_PATHS.PATIENT.DELIVERIES,
      );
      this.deliveries.set(data.deliveries ?? []);
    } catch {
      // no-op
    } finally {
      this.loading.set(false);
    }
  }

  statusText(status: string) {
    return STATUS_LABELS[status] ?? status;
  }
}
