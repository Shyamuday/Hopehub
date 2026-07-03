import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { PlatformAuthService } from '../../services/platform-auth.service';
import { DevLoginPanelComponent } from '../../shared/dev-login-panel/dev-login-panel';
import { DEV_DEMO_ACCOUNTS } from '../../core/constants/dev-demo.constants';
import type { DevFillCredentials } from '../../core/types/dev-demo.types';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, DevLoginPanelComponent],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private auth = inject(PlatformAuthService);
  private router = inject(Router);

  email = DEV_DEMO_ACCOUNTS.hr.email as string;
  password = DEV_DEMO_ACCOUNTS.password as string;
  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    this.auth
      .login(this.email, this.password)
      .pipe(switchMap(() => this.auth.fetchMe()))
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate([`/${this.auth.defaultRoute()}`]);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'Invalid credentials. Please try again.');
        }
      });
  }

  onDevLoggedIn() {
    this.auth.fetchMe().subscribe({
      next: () => void this.router.navigate([`/${this.auth.defaultRoute()}`]),
      error: () => void this.router.navigate(['/dashboard'])
    });
  }

  applyDevFill(credentials: DevFillCredentials) {
    if (credentials.email) this.email = credentials.email;
    if (credentials.password) this.password = credentials.password;
  }
}
