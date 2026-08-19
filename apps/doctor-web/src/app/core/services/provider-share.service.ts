import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../constants/api-paths.constants';

export type ProviderShareLink = {
  id: string;
  code: string;
  url: string;
  kind: 'PROFILE' | 'BOOK' | 'TALK';
  mode?: 'chat' | 'voice' | 'video' | null;
  label?: string | null;
  isActive: boolean;
  expiresAt?: string | null;
  clickCount: number;
  careTeamService?: { id: string; title: string; durationMinutes: number } | null;
};

export type ProviderShareOverview = {
  provider: { name: string; slug: string; isPublic: boolean };
  permanentLinks: Record<'profile' | 'book' | 'chat' | 'voice' | 'video', string>;
  services: Array<{
    id: string;
    title: string;
    durationMinutes: number;
    priceInPaise: number;
    isFree: boolean;
  }>;
  links: ProviderShareLink[];
  totalClicks: number;
};

@Injectable({ providedIn: 'root' })
export class ProviderShareService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  load() {
    return firstValueFrom(
      this.http.get<ProviderShareOverview>(`${this.apiBase}${API_PATHS.DOCTOR.SHARE_LINKS}`),
    );
  }

  create(payload: { kind: string; mode?: string; careTeamServiceId?: string; label?: string }) {
    return firstValueFrom(
      this.http.post<{ link: ProviderShareLink }>(
        `${this.apiBase}${API_PATHS.DOCTOR.SHARE_LINKS}`,
        payload,
      ),
    );
  }

  update(id: string, payload: { isActive?: boolean; label?: string | null }) {
    return firstValueFrom(
      this.http.patch<{ link: ProviderShareLink }>(
        `${this.apiBase}${API_PATHS.DOCTOR.SHARE_LINK(id)}`,
        payload,
      ),
    );
  }
}
