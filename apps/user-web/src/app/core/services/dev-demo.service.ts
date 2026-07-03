import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import type { User } from '../../models';
import type { DevAppGuide, DevDemoPort, DevFillCredentials, DevPersona } from '@vitalis/platform-ui';

export type { DevFillCredentials, DevPersona, DevAppGuide };

@Service()
export class DevDemoService implements DevDemoPort {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  readonly enabled = !environment.production;

  loadGuide(): Promise<DevAppGuide | null> {
    if (!this.enabled) return Promise.resolve(null);
    return firstValueFrom(
      this.http.get<DevAppGuide>(`${environment.apiUrl}/dev/demo-guide/${environment.devAppId}`)
    ).catch(() => null);
  }

  async quickLogin(personaId: string) {
    const response = await firstValueFrom(
      this.http.post<{ token: string; user: User }>(`${environment.apiUrl}/dev/quick-login`, {
        persona: personaId,
        app: environment.devAppId
      })
    );
    this.auth.applyDevSession(response);
  }
}
