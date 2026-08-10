import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AUTH_PATHS } from '../../../core/constants/auth.constants';

@Component({
  selector: 'app-admin-email-verification',
  imports: [RouterLink],
  template: `
    <main class="verify-page">
      <section class="verify-card">
        <div class="mark">H</div>
        <h1>{{ title() }}</h1>
        <p>{{ message() }}</p>
        <a routerLink="/login" class="btn">Go to admin sign in</a>
      </section>
    </main>
  `,
  styles: [
    `
      .verify-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 2rem;
        background: #f8fafc;
      }
      .verify-card {
        max-width: 460px;
        text-align: center;
        background: white;
        border-radius: 24px;
        padding: 2rem;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.14);
      }
      .mark {
        width: 58px;
        height: 58px;
        margin: 0 auto 1rem;
        border-radius: 18px;
        display: grid;
        place-items: center;
        background: #111827;
        color: #fff;
        font-weight: 900;
      }
      h1 {
        margin: 0 0 0.65rem;
        color: #0f172a;
      }
      p {
        color: #475569;
        line-height: 1.6;
      }
      .btn {
        display: inline-flex;
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 999px;
        background: #111827;
        color: #fff;
        text-decoration: none;
        font-weight: 800;
      }
    `,
  ],
})
export class AdminEmailVerification {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly apiBase = environment.apiUrl;

  readonly title = signal('Verifying your admin email…');
  readonly message = signal('Please wait while we confirm your HopeHub admin email.');

  constructor() {
    void this.verify();
  }

  private async verify() {
    const token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!token) {
      this.title.set('Verification link missing');
      this.message.set('Please open the latest verification link from your email.');
      return;
    }

    try {
      await firstValueFrom(this.http.post(`${this.apiBase}${AUTH_PATHS.VERIFY_EMAIL}`, { token }));
      this.title.set('Email verified');
      this.message.set('Your email is verified. You can continue to the admin console.');
    } catch (error: any) {
      this.title.set('Could not verify email');
      this.message.set(error?.error?.message || 'This verification link is invalid or expired.');
    }
  }
}
