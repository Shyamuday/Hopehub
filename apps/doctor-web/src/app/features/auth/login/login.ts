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
  mode: 'signin' | 'enroll' = 'signin';

  email = '';
  password = '';
  error = '';
  name = '';
  mobile = '';
  specialty = '';
  registrationNo = '';

  constructor(
    private readonly auth: Auth,
    private readonly router: Router
  ) {}

  async submit() {
    this.error = '';
    const ok = await this.auth.login(this.email, this.password);
    if (!ok) {
      this.error = 'Invalid login or API unavailable.';
      return;
    }

    void this.router.navigateByUrl('/dashboard');
  }

  async enroll() {
    this.error = '';
    const ok = await this.auth.enrollDoctor({
      name: this.name,
      email: this.email,
      mobile: this.mobile || undefined,
      password: this.password,
      specialty: this.specialty,
      registrationNo: this.registrationNo || undefined
    });

    if (!ok) {
      this.error = 'Could not enroll doctor account.';
      return;
    }

    void this.router.navigateByUrl('/dashboard');
  }
}
