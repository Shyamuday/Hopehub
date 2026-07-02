import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DEFAULT_AUTHED_ROUTE, ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { Auth } from '../../../core/services/auth';

import { DevLoginPanelComponent } from '../../../shared/dev-login-panel/dev-login-panel';
import { DEV_DEMO_ACCOUNTS } from '../../../core/constants/dev-demo.constants';
import type { DevFillCredentials } from '../../../core/types/dev-demo.types';

@Component({
  selector: 'app-login',
  imports: [FormsModule, DevLoginPanelComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  mode: 'signin' | 'enroll' = 'signin';

  email = DEV_DEMO_ACCOUNTS.doctor.email;
  password = DEV_DEMO_ACCOUNTS.password;
  error = '';
  message = '';
  submitting = false;
  name = '';
  mobile = '';
  specialty = '';
  registrationNo = '';

  constructor(
    private readonly auth: Auth,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : `/${DEFAULT_AUTHED_ROUTE}`);
  }

  async submit() {
    this.error = '';
    this.message = '';
    this.submitting = true;
    try {
      const result = await this.auth.login(this.email, this.password);
      if (!result.ok) {
        this.error = result.message;
        return;
      }
      void this.navigateAfterLogin();
    } finally {
      this.submitting = false;
    }
  }

  onDevLoggedIn() {
    void this.navigateAfterLogin();
  }

  applyDevFill(credentials: DevFillCredentials) {
    if (credentials.email) this.email = credentials.email;
    if (credentials.password) this.password = credentials.password;
  }

  async enroll() {
    this.error = '';
    this.message = '';
    this.submitting = true;
    try {
      const result = await this.auth.enrollDoctor({
        name: this.name,
        email: this.email,
        mobile: this.mobile || undefined,
        password: this.password,
        specialty: this.specialty,
        registrationNo: this.registrationNo || undefined
      });

      if (!result.ok) {
        this.error = result.message;
        return;
      }

      this.mode = 'signin';
      this.message = result.message;
    } finally {
      this.submitting = false;
    }
  }
}
