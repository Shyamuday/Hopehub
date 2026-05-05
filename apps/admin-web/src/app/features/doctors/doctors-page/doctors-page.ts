import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminApi } from '../../../core/services/admin-api';

type Doctor = {
  id: string;
  name: string;
  email?: string;
  isActive: boolean;
  doctorProfile?: {
    specialty?: string;
    registrationNo?: string;
  };
};

@Component({
  selector: 'app-doctors-page',
  imports: [CommonModule],
  templateUrl: './doctors-page.html',
  styleUrl: './doctors-page.scss'
})
export class DoctorsPage {
  doctors: Doctor[] = [];
  pendingDoctors: Doctor[] = [];
  error = '';
  message = '';

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.error = '';
    try {
      const [allDoctors, pending] = await Promise.all([this.api.getDoctors(), this.api.getPendingDoctors()]);
      this.doctors = allDoctors.doctors || [];
      this.pendingDoctors = pending.pendingDoctors || [];
    } catch {
      this.error = 'Could not load doctors.';
    }
  }

  async approveDoctor(doctorId: string) {
    this.message = '';
    this.error = '';
    try {
      await this.api.approveDoctor(doctorId);
      this.message = 'Doctor approved.';
      await this.load();
    } catch {
      this.error = 'Could not approve doctor.';
    }
  }

  async rejectDoctor(doctorId: string) {
    this.message = '';
    this.error = '';
    try {
      await this.api.rejectDoctor(doctorId);
      this.message = 'Doctor kept as pending/inactive.';
      await this.load();
    } catch {
      this.error = 'Could not update doctor status.';
    }
  }
}
