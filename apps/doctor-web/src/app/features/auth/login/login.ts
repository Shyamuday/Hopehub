import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  readonly patientPortalUrl = environment.patientPortalUrl?.trim() || '';

  mode: 'signin' | 'enroll' = 'signin';

  email = '';
  password = '';
  error = '';
  message = '';
  submitting = false;
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
    this.message = '';
    this.submitting = true;
    try {
      const result = await this.auth.login(this.email, this.password);
      if (!result.ok) {
        this.error = result.message;
        return;
      }
      void this.router.navigateByUrl('/dashboard');
    } finally {
      this.submitting = false;
    }
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
