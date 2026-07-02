import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_PATHS } from './core/constants/api-paths.constants';
import { environment } from '../environments/environment';
import { AuthService } from './auth/auth.service';

type Profile = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  chronicConditions?: string | null;
};

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './patient-profile.component.scss',
  templateUrl: './patient-profile.component.html'
})
export class PatientProfileComponent implements OnInit {
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly successMsg = signal('');
  readonly errorMsg = signal('');
  readonly profile = signal<Profile | null>(null);

  name = '';
  allergies = '';
  currentMedications = '';
  chronicConditions = '';

  constructor(private readonly auth: AuthService) {}

  ngOnInit() {
    void this.load();
  }

  private get token() { return this.auth.token || ''; }

  private async apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${environment.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(init?.headers || {})
      }
    });
    if (!res.ok) throw new Error((await res.json())?.message || 'Request failed');
    return res.json() as Promise<T>;
  }

  async load() {
    this.loading.set(true);
    try {
      const { profile } = await this.apiFetch<{ profile: Profile }>(API_PATHS.PATIENT.PROFILE);
      this.profile.set(profile);
      this.name = profile.name;
      this.allergies = profile.allergies || '';
      this.currentMedications = profile.currentMedications || '';
      this.chronicConditions = profile.chronicConditions || '';
    } catch {
      this.errorMsg.set('Could not load profile.');
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    this.saving.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');
    try {
      const { profile } = await this.apiFetch<{ profile: Profile }>(API_PATHS.PATIENT.PROFILE, {
        method: 'PUT',
        body: JSON.stringify({
          name: this.name.trim(),
          allergies: this.allergies.trim() || undefined,
          currentMedications: this.currentMedications.trim() || undefined,
          chronicConditions: this.chronicConditions.trim() || undefined
        })
      });
      this.profile.set(profile);
      this.successMsg.set('Profile saved.');
      setTimeout(() => this.successMsg.set(''), 3000);
    } catch (err: any) {
      this.errorMsg.set(err?.message || 'Could not save profile.');
    } finally {
      this.saving.set(false);
    }
  }
}
