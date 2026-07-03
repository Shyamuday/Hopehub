import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PlatformAuthService } from '../services/platform-auth.service';
import { AdminAuth } from '../../../../admin-web/src/app/core/services/admin-auth';

/** Bridges platform staff auth for embedded admin-console pages. */
@Injectable({ providedIn: 'root' })
export class AdminAuthBridge extends AdminAuth {
  private readonly platform = inject(PlatformAuthService);

  constructor() {
    super(inject(HttpClient));
  }

  override isLoggedIn() {
    return this.platform.isLoggedIn();
  }

  override token() {
    return this.platform.getToken() || '';
  }

  override async login(email: string, password: string) {
    const result = await super.login(email, password);
    if (result.ok) {
      await firstValueFrom(this.platform.fetchMe());
    }
    return result;
  }

  override applyDevLogin(token: string) {
    localStorage.setItem('operations_token', token);
    super.applyDevLogin(token);
  }

  override logout() {
    super.logout();
    this.platform.logout();
  }
}
