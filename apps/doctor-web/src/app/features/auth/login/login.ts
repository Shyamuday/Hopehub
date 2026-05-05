import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  error = '';

  constructor(
    private readonly auth: Auth,
    private readonly router: Router
  ) {}

  submit() {
    const ok = this.auth.login(this.email, this.password);
    if (!ok) {
      this.error = 'Email and password are required.';
      return;
    }

    void this.router.navigateByUrl('/dashboard');
  }
}
