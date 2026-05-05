import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuth } from '../../../core/services/admin-auth';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss'
})
export class AdminLogin {
  email = '';
  password = '';
  error = '';

  constructor(
    private readonly auth: AdminAuth,
    private readonly router: Router
  ) {}

  async submit() {
    this.error = '';
    const result = await this.auth.login(this.email, this.password);
    if (!result.ok) {
      this.error = result.message;
      return;
    }

    void this.router.navigateByUrl('/dashboard');
  }
}
