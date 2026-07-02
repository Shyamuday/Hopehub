import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuth } from '../../../core/services/admin-auth';
import { DEFAULT_AUTHED_ROUTE } from '../../../core/constants/app-routes.constants';
import { DevLoginPanelComponent } from '../../../shared/dev-login-panel/dev-login-panel';
import { DEV_DEMO_ACCOUNTS } from '../../../core/constants/dev-demo.constants';
import type { DevFillCredentials } from '../../../core/types/dev-demo.types';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, DevLoginPanelComponent],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss'
})
export class AdminLogin {
  email = DEV_DEMO_ACCOUNTS.admin.email;
  password = DEV_DEMO_ACCOUNTS.password;
  error = '';
  submitting = false;

  constructor(
    private readonly auth: AdminAuth,
    private readonly router: Router
  ) {}

  async submit() {
    this.error = '';
    this.submitting = true;
    try {
      const result = await this.auth.login(this.email, this.password);
      if (!result.ok) {
        this.error = result.message;
        return;
      }
      void this.router.navigateByUrl(`/${DEFAULT_AUTHED_ROUTE}`);
    } finally {
      this.submitting = false;
    }
  }

  onDevLoggedIn() {
    void this.router.navigateByUrl(`/${DEFAULT_AUTHED_ROUTE}`);
  }

  applyDevFill(credentials: DevFillCredentials) {
    if (credentials.email) this.email = credentials.email;
    if (credentials.password) this.password = credentials.password;
  }
}
