import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminApi } from '../../../core/services/admin-api';

type Consumer = {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  consultations: number;
};

@Component({
  selector: 'app-consumers-page',
  imports: [CommonModule],
  templateUrl: './consumers-page.html',
  styleUrl: './consumers-page.scss'
})
export class ConsumersPage {
  consumers: Consumer[] = [];
  error = '';

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.error = '';
    try {
      const response = await this.api.getConsultations();
      const consultations = response.consultations || [];
      const grouped = new Map<string, Consumer>();

      for (const consultation of consultations) {
        const patient = consultation.patient;
        if (!patient?.id) {
          continue;
        }

        const existing = grouped.get(patient.id);
        if (existing) {
          existing.consultations += 1;
          continue;
        }

        grouped.set(patient.id, {
          id: patient.id,
          name: patient.name || 'Unknown',
          email: patient.email || '',
          mobile: patient.mobile || '',
          consultations: 1
        });
      }

      this.consumers = Array.from(grouped.values()).sort((a, b) => b.consultations - a.consultations);
    } catch {
      this.error = 'Could not load consumers.';
    }
  }
}
