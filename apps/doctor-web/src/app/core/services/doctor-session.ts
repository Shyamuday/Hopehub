import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../constants/api-paths.constants';
import type { DoctorProfileSummary } from '../constants/doctor-types.constants';
import { capabilitiesForProvider } from '../constants/doctor-types.constants';
import { navItemsForDoctorProfile } from '../constants/doctor-nav.constants';
import type { ProviderReadinessDto } from '@hopehub/contracts';

export type DoctorSession = {
  name: string;
  email?: string | null;
  mobile?: string | null;
  profileImageUrl?: string | null;
  doctorProfile: DoctorProfileSummary | null;
};

export type ProviderReadiness = ProviderReadinessDto;

@Service()
export class DoctorSessionService {
  private readonly apiBase = environment.apiUrl;
  private session: DoctorSession | null = null;

  private readonly http = inject(HttpClient);

  async load(force = false) {
    if (this.session && !force) return this.session;

    const response = await firstValueFrom(
      this.http.get<{
        profile: {
          name: string;
          email?: string | null;
          mobile?: string | null;
          profileImageUrl?: string | null;
          doctorProfile?: DoctorProfileSummary | null;
        };
      }>(`${this.apiBase}${API_PATHS.DOCTOR.PROFILE}`),
    );

    this.session = {
      name: response.profile.name,
      email: response.profile.email,
      mobile: response.profile.mobile,
      profileImageUrl: response.profile.profileImageUrl ?? null,
      doctorProfile: response.profile.doctorProfile || null,
    };

    return this.session;
  }

  clear() {
    this.session = null;
  }

  snapshot() {
    return this.session;
  }

  navItems() {
    return navItemsForDoctorProfile(this.session?.doctorProfile);
  }

  capabilities() {
    return capabilitiesForProvider(this.session?.doctorProfile);
  }

  async readiness() {
    const response = await firstValueFrom(
      this.http.get<{ readiness: ProviderReadiness }>(
        `${this.apiBase}${API_PATHS.DOCTOR.READINESS}`,
      ),
    );
    return response.readiness;
  }
}
