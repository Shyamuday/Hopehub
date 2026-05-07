import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

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
  message = '';
  error = '';
  isLoading = false;
  saving = false;

  constructor(private readonly http: HttpClient) {
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
            doctorProfile?: {
              specialty?: string;
              registrationNo?: string | null;
              isAvailable?: boolean;
            } | null;
          };
        }>(`${this.apiBase}/doctor/profile`)
      );

      const profile = response.profile;
      this.name = profile.name || '';
      this.email = profile.email || '';
      this.mobile = profile.mobile || '';
      this.specialty = profile.doctorProfile?.specialty || '';
      this.registrationNo = profile.doctorProfile?.registrationNo || '';
      this.isAvailable = profile.doctorProfile?.isAvailable ?? true;
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
        this.http.put(`${this.apiBase}/doctor/profile`, {
          name: this.name,
          mobile: this.mobile,
          specialty: this.specialty,
          registrationNo: this.registrationNo,
          isAvailable: this.isAvailable
        })
      );
      this.message = 'Profile updated successfully.';
    } catch {
      this.error = 'Could not save profile.';
    } finally {
      this.saving = false;
    }
  }
}
