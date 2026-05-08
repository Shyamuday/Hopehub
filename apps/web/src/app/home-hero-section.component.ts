import { CommonModule } from '@angular/common';
import { Component, Input, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth/auth.service';

type BookStep = 'form' | 'otp' | 'loading' | 'done';

@Component({
  selector: 'app-home-hero-section',
  imports: [CommonModule, FormsModule, TranslatePipe],
  styles: [`
    .hero-layout {
      display: grid;
      gap: 1.75rem;
      align-items: start;
    }
    .hero-main {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 0;
    }
    @media (max-width: 899px) {
      .booking-card {
        margin-inline: auto;
        width: min(440px, 100%);
      }
    }
    @media (min-width: 900px) {
      .hero-layout {
        grid-template-columns: minmax(0, 1fr) minmax(280px, 400px);
        gap: clamp(1.75rem, 4vw, 2.75rem);
      }
      .hero-aside {
        position: sticky;
        top: max(5.5rem, calc(env(safe-area-inset-top, 0px) + 4.5rem));
      }
      .booking-card {
        margin-top: 0;
        max-width: none;
        width: 100%;
      }
    }
    .booking-card {
      background: #fff;
      border: 1.5px solid #e5e7eb;
      border-radius: 16px;
      padding: 1.5rem 1.75rem;
      margin-top: 0;
      box-shadow: 0 2px 12px rgba(0,0,0,.06);
      max-width: 440px;
    }
    .booking-card h3 {
      margin: 0 0 .1rem;
      font-size: 1.05rem;
      font-weight: 700;
      color: #111827;
    }
    .booking-card .bc-sub {
      font-size: .83rem;
      color: #6b7280;
      margin: 0 0 1rem;
    }
    .bc-fields {
      display: flex;
      flex-direction: column;
      gap: .65rem;
    }
    .bc-fields input {
      width: 100%;
      box-sizing: border-box;
      border: 1.5px solid #d1d5db;
      border-radius: 10px;
      padding: .65rem .85rem;
      font-size: .93rem;
      outline: none;
      transition: border-color .15s;
      &:focus { border-color: #2563eb; }
    }
    .bc-btn {
      width: 100%;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: .7rem 1rem;
      font-size: .95rem;
      font-weight: 700;
      cursor: pointer;
      margin-top: .25rem;
      transition: background .15s;
      &:hover:not(:disabled) { background: #1d4ed8; }
      &:disabled { opacity: .55; cursor: not-allowed; }
    }
    .bc-error {
      color: #dc2626;
      font-size: .8rem;
      margin: .4rem 0 0;
    }
    .bc-hint {
      font-size: .78rem;
      color: #9ca3af;
      margin: .5rem 0 0;
      text-align: center;
    }
    .bc-otp-who {
      font-size: .83rem;
      color: #374151;
      margin: 0 0 .85rem;
      strong { color: #111827; }
    }
    .bc-back {
      background: none;
      border: none;
      color: #6b7280;
      font-size: .8rem;
      cursor: pointer;
      padding: .35rem 0 0;
      text-decoration: underline;
      &:hover { color: #374151; }
    }
    .bc-loading {
      display: flex;
      align-items: center;
      gap: .6rem;
      color: #6b7280;
      font-size: .9rem;
      padding: .5rem 0;
    }
    .bc-spinner {
      width: 18px;
      height: 18px;
      border: 2.5px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .bc-done {
      text-align: center;
      padding: .25rem 0;
      font-size: .9rem;
      color: #065f46;
      font-weight: 600;
    }
  `],
  template: `
    <section class="panel hero-panel">
      <div class="hero-layout">
        <div class="hero-main">
          <div class="home-hero">
            <p class="eyebrow">{{ 'home.hero.eyebrow' | translate }}</p>
            <h1>{{ 'home.hero.title' | translate }}</h1>
            <p class="hero-copy">{{ 'home.hero.subtitle' | translate }}</p>
          </div>

          <div class="hero-trust-row">
            <div class="trust-item">
              <span class="trust-icon">✓</span>
              <span>{{ 'home.hero.trust.licensed' | translate }}</span>
            </div>
            <div class="trust-item">
              <span class="trust-icon">✓</span>
              <span>{{ 'home.hero.trust.secure' | translate }}</span>
            </div>
            <div class="trust-item">
              <span class="trust-icon">✓</span>
              <span>{{ 'home.hero.trust.followUp' | translate }}</span>
            </div>
          </div>
        </div>

        <aside class="hero-aside" [attr.aria-label]="asideAriaLabel()">
          <div class="booking-card">
          @switch (step()) {
            @case ('form') {
              <h3>{{ 'home.hero.booking.titleForm' | translate }}</h3>
              <p class="bc-sub">{{ 'home.hero.booking.subForm' | translate }}</p>
              <div class="bc-fields">
                <input
                  name="bcName"
                  [(ngModel)]="name"
                  [placeholder]="('home.hero.booking.placeholderName' | translate)"
                  autocomplete="name"
                />
                <input
                  name="bcMobile"
                  [(ngModel)]="mobile"
                  [placeholder]="('home.hero.booking.placeholderMobile' | translate)"
                  inputmode="tel"
                  autocomplete="tel"
                />
                <button class="bc-btn" type="button" [disabled]="busy()" (click)="sendOtp()">
                  @if (busy()) {
                    {{ 'home.hero.booking.submitBusy' | translate }}
                  } @else {
                    {{ 'home.hero.booking.submitIdle' | translate }}
                  }
                </button>
              </div>
              @if (error()) {
                <p class="bc-error">{{ error() }}</p>
              }
              <p class="bc-hint">{{ 'home.hero.booking.hintOtp' | translate }}</p>
            }

            @case ('otp') {
              <h3>{{ 'home.hero.booking.titleOtp' | translate }}</h3>
              <p class="bc-otp-who">
                {{ 'home.hero.booking.otpLead' | translate }} <strong>{{ mobile }}</strong>
              </p>
              <div class="bc-fields">
                <input
                  name="bcOtp"
                  [(ngModel)]="otp"
                  [placeholder]="('home.hero.booking.placeholderOtp' | translate)"
                  inputmode="numeric"
                  maxlength="6"
                />
                <button class="bc-btn" type="button" [disabled]="busy() || otp.length < 4" (click)="verifyOtp()">
                  @if (busy()) {
                    {{ 'home.hero.booking.confirmBusy' | translate }}
                  } @else {
                    {{ 'home.hero.booking.confirmIdle' | translate }}
                  }
                </button>
              </div>
              @if (error()) {
                <p class="bc-error">{{ error() }}</p>
              }
              <button class="bc-back" type="button" (click)="goBack()">
                {{ 'home.hero.booking.backChange' | translate }}
              </button>
            }

            @case ('loading') {
              <div class="bc-loading" aria-live="polite">
                <div class="bc-spinner"></div>
                <span>{{ 'home.hero.booking.loadingAccount' | translate }}</span>
              </div>
            }

            @case ('done') {
              <div class="bc-done" aria-live="polite">{{ 'home.hero.booking.doneToast' | translate }}</div>
            }
          }
          </div>
        </aside>
      </div>
    </section>
  `
})
export class HomeHeroSectionComponent {
  private readonly translate = inject(TranslateService);

  /** Re-read translations when locale changes without full navigation. */
  private readonly localeTick = signal(0);

  readonly asideAriaLabel = computed(() => {
    this.localeTick();
    const k: Record<BookStep, string> = {
      form: 'home.hero.booking.aria.form',
      otp: 'home.hero.booking.aria.otp',
      loading: 'home.hero.booking.aria.loading',
      done: 'home.hero.booking.aria.done'
    };
    return this.translate.instant(k[this.step()]);
  });

  @Input() whatsappLink = '';

  name = '';
  mobile = '';
  otp = '';

  readonly step = signal<BookStep>('form');
  readonly busy = signal(false);
  readonly error = signal('');

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    destroyRef: DestroyRef
  ) {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => this.localeTick.update((n) => n + 1));
  }

  async sendOtp() {
    const name = this.name.trim();
    const mobile = this.mobile.trim().replace(/\s+/g, '');
    if (!name) {
      this.error.set(this.translate.instant('home.hero.booking.validation.nameRequired'));
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      this.error.set(this.translate.instant('home.hero.booking.validation.mobileInvalid'));
      return;
    }

    this.error.set('');
    this.busy.set(true);
    try {
      await firstValueFrom(this.auth.requestOtp(mobile));
      this.mobile = mobile;
      this.step.set('otp');
    } catch (err: any) {
      this.error.set(
        err?.error?.message || this.translate.instant('home.hero.booking.validation.otpSendFailed')
      );
    } finally {
      this.busy.set(false);
    }
  }

  async verifyOtp() {
    if (!this.otp.trim()) {
      this.error.set(this.translate.instant('home.hero.booking.validation.otpMissing'));
      return;
    }
    this.error.set('');
    this.busy.set(true);
    this.step.set('loading');
    try {
      const response = await firstValueFrom(
        this.auth.patientLogin({ name: this.name.trim(), mobile: this.mobile, otp: this.otp.trim() })
      );
      this.step.set('done');
      setTimeout(() => void this.router.navigateByUrl(this.auth.dashboardFor(response.user.role)), 600);
    } catch (err: any) {
      this.step.set('otp');
      this.error.set(
        err?.error?.message || this.translate.instant('home.hero.booking.validation.otpWrong')
      );
    } finally {
      this.busy.set(false);
    }
  }

  goBack() {
    this.otp = '';
    this.error.set('');
    this.step.set('form');
  }
}
