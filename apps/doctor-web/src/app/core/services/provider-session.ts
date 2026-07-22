import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../constants/api-paths.constants';
import type { DoctorProfileSummary } from '../constants/doctor-types.constants';
import { capabilitiesForDoctorType } from '../constants/doctor-types.constants';
import { navItemsForDoctorType } from '../constants/doctor-nav.constants';

export type ProviderSession = {
  name: string;
  email?: string | null;
  mobile?: string | null;
  profileImageUrl?: string | null;
  doctorProfile: DoctorProfileSummary | null;
};

@Service()
export class ProviderSessionService {
  private readonly apiBase = environment.apiUrl;
  private session: ProviderSession | null = null;

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
      }>(`${this.apiBase}${API_PATHS.PROVIDER.PROFILE}`),
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
    return navItemsForDoctorType(
      this.session?.doctorProfile?.doctorType,
      this.session?.doctorProfile?.providerType,
    );
  }

  capabilities() {
    return capabilitiesForDoctorType(
      this.session?.doctorProfile?.doctorType,
      this.session?.doctorProfile?.providerType,
    );
  }
}
