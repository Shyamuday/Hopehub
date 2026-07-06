import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PlatformAuthService } from '../services/platform-auth.service';
import { AdminAuth } from '@vitalis/admin-console/core/services/admin-auth';
import type { StaffUser } from '@vitalis/admin-console/core/admin-permissions';

/** Bridges platform staff auth for embedded admin-console pages. */
@Service()
export class AdminAuthBridge extends AdminAuth {
  private readonly platform = inject(PlatformAuthService);

  override isLoggedIn() {
    return this.platform.isLoggedIn();
  }

  override token() {
    return this.platform.getToken() || '';
  }

  private syncUserFromPlatform() {
    const sessionUser = this.platform.currentUser();
    if (sessionUser) {
      this.setUser(sessionUser as StaffUser);
    }
  }

  override async login(email: string, password: string) {
    const result = await super.login(email, password);
    if (result.ok) {
      await firstValueFrom(this.platform.fetchMe());
      this.syncUserFromPlatform();
    }
    return result;
  }

  override async refreshSession() {
    await firstValueFrom(this.platform.fetchMe());
    this.syncUserFromPlatform();
    return this.user();
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
