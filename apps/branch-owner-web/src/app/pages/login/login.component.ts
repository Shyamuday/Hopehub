import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HrAuthService } from '../../services/hr-auth.service';
import { DEFAULT_AUTHED_ROUTE } from '../../core/constants/app-routes.constants';
import { DevLoginPanelComponent } from '../../shared/dev-login-panel/dev-login-panel';
import { DEV_DEMO_ACCOUNTS } from '../../core/constants/dev-demo.constants';
import type { DevFillCredentials } from '../../core/types/dev-demo.types';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, DevLoginPanelComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private auth = inject(HrAuthService);
  private router = inject(Router);

  email = DEV_DEMO_ACCOUNTS.accountant.email;
  password = DEV_DEMO_ACCOUNTS.password;
  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([`/${DEFAULT_AUTHED_ROUTE}`]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Invalid credentials. Please try again.');
      }
    });
  }

  onDevLoggedIn() {
    void this.router.navigate([`/${DEFAULT_AUTHED_ROUTE}`]);
  }

  applyDevFill(credentials: DevFillCredentials) {
    if (credentials.email) this.email = credentials.email;
    if (credentials.password) this.password = credentials.password;
  }
}
