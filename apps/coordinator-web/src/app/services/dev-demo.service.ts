import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { HrAuthService } from './hr-auth.service';
import type { AuthResponse } from '../models';
import type { DevAppGuide } from '../core/types/dev-demo.types';

export type { DevFillCredentials, DevPersona, DevAppGuide } from '../core/types/dev-demo.types';

@Injectable({ providedIn: 'root' })
export class DevDemoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(HrAuthService);
  readonly enabled = !environment.production;

  loadGuide(): Promise<DevAppGuide | null> {
    if (!this.enabled) return Promise.resolve(null);
    return firstValueFrom(
      this.http.get<DevAppGuide>(`${environment.apiUrl}/dev/demo-guide/${environment.devAppId}`)
    ).catch(() => null);
  }

  async quickLogin(personaId: string) {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${environment.apiUrl}/dev/quick-login`, {
        persona: personaId,
        app: environment.devAppId
      })
    );
    this.auth.applyDevAuth(response);
  }
}
