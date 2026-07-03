import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import type { DoctorProfileSummary } from '../../../core/constants/doctor-types.constants';
import { DoctorSessionService } from '../../../core/services/doctor-session';

@Component({
  selector: 'app-profile-page',
  imports: [FormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss'
})
export class ProfilePage {
  private readonly apiBase = environment.apiUrl;

  name = '';
  email = '';
  mobile = '';
  specialty = '';
  registrationNo = '';
  isAvailable = true;
  doctorTypeLabel = '';
  specialtyFocusLabel = '';
  message = '';
  error = '';
  isLoading = false;
  saving = false;

  constructor(
    private readonly http: HttpClient,
    private readonly session: DoctorSessionService
  ) {
    void this.loadProfile();
  }

  async loadProfile() {
    this.isLoading = true;
    this.error = '';
    try {
      const response = await firstValueFrom(
        this.http.get<{
          profile: {
            name: string;
            email?: string | null;
            mobile?: string | null;
            doctorProfile?: DoctorProfileSummary | null;
          };
        }>(`${this.apiBase}${API_PATHS.DOCTOR.PROFILE}`)
      );

      const profile = response.profile;
      this.name = profile.name || '';
      this.email = profile.email || '';
      this.mobile = profile.mobile || '';
      this.specialty = profile.doctorProfile?.specialty || '';
      this.registrationNo = profile.doctorProfile?.registrationNo || '';
      this.isAvailable = profile.doctorProfile?.isAvailable ?? true;
      this.doctorTypeLabel = profile.doctorProfile?.doctorTypeLabel || 'Doctor';
      this.specialtyFocusLabel = profile.doctorProfile?.specialtyFocusLabel || '';
    } catch {
      this.error = 'Could not load profile.';
    } finally {
      this.isLoading = false;
    }
  }

  async saveProfile() {
    this.message = '';
    this.error = '';
    this.saving = true;
    try {
      await firstValueFrom(
        this.http.put(`${this.apiBase}${API_PATHS.DOCTOR.PROFILE}`, {
          name: this.name,
          mobile: this.mobile,
          specialty: this.specialty,
          registrationNo: this.registrationNo,
          isAvailable: this.isAvailable
        })
      );
      await this.session.load(true);
      this.message = 'Profile updated successfully.';
    } catch {
      this.error = 'Could not save profile.';
    } finally {
      this.saving = false;
    }
  }
}
