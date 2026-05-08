import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

type CredentialKind = 'DEGREE' | 'COUNCIL_REG' | 'OTHER';

type DoctorProfileApi = {
  specialty?: string;
  registrationNo?: string | null;
  isAvailable?: boolean;
  bio?: string | null;
  qualifications?: string | null;
  homoeopathyMethods?: string | null;
  clinicalFocus?: string | null;
  languagesSpoken?: string | null;
  yearsExperience?: number | null;
  stateCouncilName?: string | null;
  stateCouncilRegNo?: string | null;
  degreeCertificateUrl?: string | null;
  councilRegCertificateUrl?: string | null;
  otherCredentialUrl?: string | null;
};

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

  bio = '';
  qualifications = '';
  homoeopathyMethods = '';
  clinicalFocus = '';
  languagesSpoken = '';
  yearsExperience: number | null = null;
  stateCouncilName = '';
  stateCouncilRegNo = '';

  degreeCertificateUrl: string | null = null;
  councilRegCertificateUrl: string | null = null;
  otherCredentialUrl: string | null = null;

  uploadBusy: CredentialKind | null = null;

  message = '';
  error = '';
  isLoading = false;
  saving = false;

  constructor(private readonly http: HttpClient) {
    void this.loadProfile();
  }

  private applyDoctorProfile(dp: DoctorProfileApi | null | undefined) {
    this.specialty = dp?.specialty || '';
    this.registrationNo = dp?.registrationNo || '';
    this.isAvailable = dp?.isAvailable ?? true;
    this.bio = dp?.bio || '';
    this.qualifications = dp?.qualifications || '';
    this.homoeopathyMethods = dp?.homoeopathyMethods || '';
    this.clinicalFocus = dp?.clinicalFocus || '';
    this.languagesSpoken = dp?.languagesSpoken || '';
    this.yearsExperience = dp?.yearsExperience ?? null;
    this.stateCouncilName = dp?.stateCouncilName || '';
    this.stateCouncilRegNo = dp?.stateCouncilRegNo || '';
    this.degreeCertificateUrl = dp?.degreeCertificateUrl ?? null;
    this.councilRegCertificateUrl = dp?.councilRegCertificateUrl ?? null;
    this.otherCredentialUrl = dp?.otherCredentialUrl ?? null;
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
            doctorProfile?: DoctorProfileApi | null;
          };
        }>(`${this.apiBase}/doctor/profile`)
      );

      const profile = response.profile;
      this.name = profile.name || '';
      this.email = profile.email || '';
      this.mobile = profile.mobile || '';
      this.applyDoctorProfile(profile.doctorProfile);
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
      const response = await firstValueFrom(
        this.http.put<{
          profile: {
            doctorProfile?: DoctorProfileApi | null;
          };
        }>(`${this.apiBase}/doctor/profile`, {
          name: this.name,
          mobile: this.mobile,
          specialty: this.specialty,
          registrationNo: this.registrationNo,
          isAvailable: this.isAvailable,
          bio: this.bio,
          qualifications: this.qualifications,
          homoeopathyMethods: this.homoeopathyMethods,
          clinicalFocus: this.clinicalFocus,
          languagesSpoken: this.languagesSpoken,
          yearsExperience: this.yearsExperience,
          stateCouncilName: this.stateCouncilName,
          stateCouncilRegNo: this.stateCouncilRegNo
        })
      );
      this.applyDoctorProfile(response.profile?.doctorProfile);
      this.message = 'Profile updated successfully.';
    } catch {
      this.error = 'Could not save profile.';
    } finally {
      this.saving = false;
    }
  }

  onYearsChange(value: string | number | null) {
    if (value === '' || value === null || value === undefined) {
      this.yearsExperience = null;
      return;
    }
    const n = typeof value === 'number' ? value : Number(value);
    this.yearsExperience = Number.isFinite(n) ? n : null;
  }

  async onCredentialSelected(kind: CredentialKind, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.message = '';
    this.error = '';
    this.uploadBusy = kind;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);

      const res = await firstValueFrom(
        this.http.post<{
          kind: CredentialKind;
          degreeCertificateUrl?: string | null;
          councilRegCertificateUrl?: string | null;
          otherCredentialUrl?: string | null;
        }>(`${this.apiBase}/doctor/profile/credential`, fd)
      );

      if (res.degreeCertificateUrl !== undefined) {
        this.degreeCertificateUrl = res.degreeCertificateUrl;
      }
      if (res.councilRegCertificateUrl !== undefined) {
        this.councilRegCertificateUrl = res.councilRegCertificateUrl;
      }
      if (res.otherCredentialUrl !== undefined) {
        this.otherCredentialUrl = res.otherCredentialUrl;
      }
      this.message = 'Document uploaded.';
    } catch {
      this.error = 'Upload failed. Use JPG, PNG, WebP, or PDF (max 15 MB).';
    } finally {
      this.uploadBusy = null;
    }
  }
}
