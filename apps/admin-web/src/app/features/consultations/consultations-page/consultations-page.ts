import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../../core/services/admin-api';

@Component({
  selector: 'app-consultations-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './consultations-page.html',
  styleUrl: './consultations-page.scss'
})
export class ConsultationsPage {
  consultations: Array<{
    id: string;
    status: string;
    createdAt: string;
    patient?: { id?: string; name?: string; mobile?: string | null; email?: string | null };
    disease?: { name?: string };
    assignedDoctor?: { name?: string } | null;
  }> = [];
  loading = false;
  error = '';

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const res = await this.api.getConsultations();
      this.consultations = res.consultations || [];
    } catch {
      this.error = 'Could not load consultations. You need admin.consultations.read.';
    } finally {
      this.loading = false;
    }
  }
}
