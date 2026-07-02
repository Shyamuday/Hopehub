import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StoreAuthService } from '../../services/store-auth.service';
import type { StoreStaff } from '../../models';
import type { DevAppGuide } from '../types/dev-demo.types';

export type { DevFillCredentials, DevPersona, DevAppGuide } from '../types/dev-demo.types';

@Injectable({ providedIn: 'root' })
export class DevDemoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(StoreAuthService);
  readonly enabled = !environment.production;

  loadGuide(): Promise<DevAppGuide | null> {
    if (!this.enabled) return Promise.resolve(null);
    return firstValueFrom(
      this.http.get<DevAppGuide>(`${environment.apiUrl}/dev/demo-guide/${environment.devAppId}`)
    ).catch(() => null);
  }

  async quickLogin(personaId: string) {
    const response = await firstValueFrom(
      this.http.post<{ token: string; staff: StoreStaff }>(`${environment.apiUrl}/dev/quick-login`, {
        persona: personaId,
        app: environment.devAppId
      })
    );
    this.auth.setAuth(response.token, response.staff);
  }
}
