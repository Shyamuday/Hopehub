import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AUTH_PATHS } from '../core/constants/auth.constants';

@Component({
  selector: 'app-email-verification-page',
  imports: [RouterLink],
  template: `
    <main class="verify-page">
      <section class="verify-card">
        <div class="mark">✓</div>
        <h1>{{ title() }}</h1>
        <p>{{ message() }}</p>
        <a routerLink="/" class="btn">Back to HopeHub</a>
      </section>
    </main>
  `,
  styles: [
    `
      .verify-page {
        min-height: 80vh;
        display: grid;
        place-items: center;
        padding: 2rem;
        background: #f8fafc;
      }
      .verify-card {
        max-width: 440px;
        text-align: center;
        background: #fff;
        border-radius: 24px;
        padding: 2rem;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
      }
      .mark {
        width: 58px;
        height: 58px;
        margin: 0 auto 1rem;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: #e0f2fe;
        color: #0369a1;
        font-size: 1.6rem;
        font-weight: 800;
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
        background: #0f766e;
        color: #fff;
        text-decoration: none;
        font-weight: 700;
      }
    `,
  ],
})
export class EmailVerificationPageComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly apiBase = environment.apiUrl;

  readonly title = signal('Verifying your email…');
  readonly message = signal('Please wait while we confirm your HopeHub email address.');

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
      this.message.set('Your email is verified. You can continue using HopeHub.');
    } catch (error: any) {
      this.title.set('Could not verify email');
      this.message.set(error?.error?.message || 'This verification link is invalid or expired.');
    }
  }
}
