import { CommonModule } from '@angular/common';
import { Component, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './auth/auth.service';

const MIN_PASSWORD_LEN = 8;

type Profile = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  chronicConditions?: string | null;
  hasPassword?: boolean;
  deliveryAddressLine1?: string | null;
  deliveryAddressLine2?: string | null;
  deliveryCity?: string | null;
  deliveryState?: string | null;
  deliveryPincode?: string | null;
};

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .profile-panel {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 1.5rem;
      max-width: 560px;
    }
    h2 { font-size: 1.1rem; margin: 0 0 1.25rem; }
    h3 { font-size: 1rem; margin: 0 0 0.75rem; color: #111827; }
    .field { display: flex; flex-direction: column; gap: .3rem; margin-bottom: .85rem; }
    .field label { font-size: .82rem; font-weight: 600; color: #374151; }
    .field input, .field textarea {
      border: 1.5px solid #d1d5db; border-radius: 9px;
      padding: .55rem .7rem; font-size: .9rem;
      transition: border-color .15s;
      &:focus { outline: none; border-color: #2563eb; }
    }
    .field textarea { resize: vertical; min-height: 72px; }
    .field .hint { font-size: .75rem; color: #9ca3af; }
    .field .readonly-val { font-size: .9rem; color: #6b7280; padding: .2rem 0; }
    .save-row { display: flex; align-items: center; gap: .75rem; margin-top: 1rem; flex-wrap: wrap; }
    .btn-save {
      background: #2563eb; color: #fff; border: none; border-radius: 9px;
      padding: .6rem 1.25rem; font-size: .9rem; font-weight: 700; cursor: pointer;
      &:hover:not(:disabled) { background: #1d4ed8; }
      &:disabled { opacity: .55; cursor: not-allowed; }
    }
    .btn-password {
      background: #1e293b; color: #fff; border: none; border-radius: 9px;
      padding: .55rem 1.1rem; font-size: .88rem; font-weight: 600; cursor: pointer;
      &:hover:not(:disabled) { background: #0f172a; }
      &:disabled { opacity: .55; cursor: not-allowed; }
    }
    .msg-ok { color: #16a34a; font-size: .83rem; font-weight: 600; }
    .msg-err { color: #dc2626; font-size: .83rem; }
    .loading-text { color: #6b7280; font-size: .875rem; }
    .account-section { border-top: 1px solid #e5e7eb; margin-top: 1.35rem; padding-top: 1.25rem; }
    .account-section .lede { font-size: .84rem; color: #6b7280; margin: 0 0 1rem; line-height: 1.45; }
    .inline-link { color: #2563eb; font-weight: 600; text-decoration: underline; }
    .inline-link:hover { color: #1d4ed8; }
    .subhead { font-size: .95rem; margin: 1.25rem 0 0.5rem; color: #374151; }
    .section-hint { margin: 0 0 0.85rem; font-size: .8rem; color: #6b7280; line-height: 1.4; }
  `],
  template: `
    <div class="profile-panel">
      <h2>My Profile</h2>

      @if (loading()) {
        <p class="loading-text">Loading profile…</p>
      } @else {
        <div class="field">
          <label>Full name</label>
          <input name="name" [(ngModel)]="name" placeholder="Your full name" />
        </div>

        <div class="field">
          <label>Mobile</label>
          <p class="readonly-val">{{ profile()?.mobile || '—' }}</p>
          <span class="hint">Mobile cannot be changed after registration.</span>
        </div>

        <div class="field">
          <label>Email</label>
          <p class="readonly-val">{{ profile()?.email || '—' }}</p>
        </div>

        <div class="field">
          <label>Known allergies</label>
          <textarea name="allergies" [(ngModel)]="allergies"
            placeholder="e.g. Penicillin, dust, pollen (leave blank if none)"></textarea>
        </div>

        <div class="field">
          <label>Current medications</label>
          <textarea name="currentMedications" [(ngModel)]="currentMedications"
            placeholder="List any medicines you take regularly"></textarea>
        </div>

        <div class="field">
          <label>Chronic conditions</label>
          <textarea name="chronicConditions" [(ngModel)]="chronicConditions"
            placeholder="e.g. Diabetes, hypertension, thyroid (leave blank if none)"></textarea>
        </div>

        <h3 class="subhead">Medicine delivery address</h3>
        <p class="section-hint">Optional. Used when your care team arranges courier or pharmacy delivery. You can update this anytime.</p>
        <div class="field">
          <label for="pt-del1">Address line 1</label>
          <input id="pt-del1" name="deliveryLine1" [(ngModel)]="deliveryLine1" placeholder="House / flat, street" />
        </div>
        <div class="field">
          <label for="pt-del2">Address line 2</label>
          <input id="pt-del2" name="deliveryLine2" [(ngModel)]="deliveryLine2" placeholder="Area, landmark (optional)" />
        </div>
        <div class="field">
          <label for="pt-city">City</label>
          <input id="pt-city" name="deliveryCity" [(ngModel)]="deliveryCity" />
        </div>
        <div class="field">
          <label for="pt-state">State</label>
          <input id="pt-state" name="deliveryState" [(ngModel)]="deliveryState" />
        </div>
        <div class="field">
          <label for="pt-pin">PIN code</label>
          <input id="pt-pin" name="deliveryPincode" [(ngModel)]="deliveryPincode" placeholder="e.g. 834001" />
        </div>

        <div class="save-row">
          <button class="btn-save" type="button" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save Profile' }}
          </button>
          @if (successMsg()) { <span class="msg-ok">✓ {{ successMsg() }}</span> }
          @if (errorMsg()) { <span class="msg-err">{{ errorMsg() }}</span> }
        </div>

        <section class="account-section">
          <h3>Account &amp; sign-in</h3>
          <p class="lede">
            @if (profile()?.hasPassword) {
              Change the password you use with <strong>email or mobile</strong> on the sign-in page (at least {{ MIN_PASSWORD_LEN }} characters).
            } @else {
              Set a password to sign in with email or mobile without a one-time code. You can still use OTP anytime.
              {{ MIN_PASSWORD_LEN }} characters minimum.
            }
          </p>
          @if (profile()?.hasPassword) {
            <div class="field">
              <label for="pt-current-password">Current password</label>
              <input
                id="pt-current-password"
                name="currentPassword"
                type="password"
                autocomplete="current-password"
                [(ngModel)]="currentPassword"
                [disabled]="passwordSaving()"
              />
            </div>
          }
          <div class="field">
            <label for="pt-new-password">{{ profile()?.hasPassword ? 'New password' : 'Password' }}</label>
            <input
              id="pt-new-password"
              name="newPassword"
              type="password"
              autocomplete="new-password"
              [(ngModel)]="newPassword"
              [disabled]="passwordSaving()"
            />
          </div>
          <div class="field">
            <label for="pt-confirm-password">Confirm password</label>
            <input
              id="pt-confirm-password"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              [(ngModel)]="confirmPassword"
              [disabled]="passwordSaving()"
            />
          </div>
          <div class="save-row">
            <button
              class="btn-password"
              type="button"
              (click)="updatePassword()"
              [disabled]="passwordSaving()"
            >
              {{ passwordSaving() ? 'Saving…' : (profile()?.hasPassword ? 'Update password' : 'Save password') }}
            </button>
            @if (passwordSuccess()) { <span class="msg-ok">✓ {{ passwordSuccess() }}</span> }
            @if (passwordError()) { <span class="msg-err">{{ passwordError() }}</span> }
          </div>
          <p class="lede">
            Forgot your password?
            <a routerLink="/" class="inline-link">Open sign-in</a>
            and use <strong>Forgot password</strong> if your account has an email.
          </p>
        </section>
      }
    </div>
  `
})
export class PatientProfileComponent implements OnInit {
  readonly MIN_PASSWORD_LEN = MIN_PASSWORD_LEN;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly successMsg = signal('');
  readonly errorMsg = signal('');
  readonly profile = signal<Profile | null>(null);

  readonly passwordSaving = signal(false);
  readonly passwordSuccess = signal('');
  readonly passwordError = signal('');

  name = '';
  allergies = '';
  currentMedications = '';
  chronicConditions = '';
  deliveryLine1 = '';
  deliveryLine2 = '';
  deliveryCity = '';
  deliveryState = '';
  deliveryPincode = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  constructor(private readonly auth: AuthService) {}

  ngOnInit() {
    void this.load();
  }

  private get token() { return this.auth.token || ''; }

  private async apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${environment.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(init?.headers || {})
      }
    });
    if (!res.ok) {
      let message = 'Request failed';
      try {
        const body = (await res.json()) as { message?: string };
        message = body.message || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return res.json() as Promise<T>;
  }

  async load() {
    this.loading.set(true);
    try {
      const { profile } = await this.apiFetch<{ profile: Profile }>('/patient/profile');
      this.profile.set(profile);
      this.name = profile.name;
      this.allergies = profile.allergies || '';
      this.currentMedications = profile.currentMedications || '';
      this.chronicConditions = profile.chronicConditions || '';
      this.deliveryLine1 = profile.deliveryAddressLine1 || '';
      this.deliveryLine2 = profile.deliveryAddressLine2 || '';
      this.deliveryCity = profile.deliveryCity || '';
      this.deliveryState = profile.deliveryState || '';
      this.deliveryPincode = profile.deliveryPincode || '';
    } catch {
      this.errorMsg.set('Could not load profile.');
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    this.saving.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');
    try {
      const { profile } = await this.apiFetch<{ profile: Profile }>('/patient/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: this.name.trim(),
          allergies: this.allergies.trim() || undefined,
          currentMedications: this.currentMedications.trim() || undefined,
          chronicConditions: this.chronicConditions.trim() || undefined,
          deliveryAddressLine1: this.deliveryLine1.trim() || null,
          deliveryAddressLine2: this.deliveryLine2.trim() || null,
          deliveryCity: this.deliveryCity.trim() || null,
          deliveryState: this.deliveryState.trim() || null,
          deliveryPincode: this.deliveryPincode.trim() || null
        })
      });
      this.profile.set(profile);
      this.successMsg.set('Profile saved.');
      setTimeout(() => this.successMsg.set(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save profile.';
      this.errorMsg.set(message);
    } finally {
      this.saving.set(false);
    }
  }

  private httpErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string') {
        return (body as { message: string }).message;
      }
      return err.message || 'Request failed.';
    }
    if (err instanceof Error) return err.message;
    return 'Could not update password.';
  }

  async updatePassword() {
    this.passwordSaving.set(true);
    this.passwordSuccess.set('');
    this.passwordError.set('');

    const p = this.newPassword.trim();
    const c = this.confirmPassword.trim();
    const hadPassword = Boolean(this.profile()?.hasPassword);

    if (hadPassword && !this.currentPassword) {
      this.passwordError.set('Enter your current password.');
      this.passwordSaving.set(false);
      return;
    }

    if (p.length < MIN_PASSWORD_LEN) {
      this.passwordError.set(`Use at least ${MIN_PASSWORD_LEN} characters.`);
      this.passwordSaving.set(false);
      return;
    }
    if (p !== c) {
      this.passwordError.set('New password and confirmation do not match.');
      this.passwordSaving.set(false);
      return;
    }

    try {
      await firstValueFrom(
        this.auth.patientUpdatePassword({
          newPassword: p,
          currentPassword: hadPassword ? this.currentPassword : undefined
        })
      );
      this.newPassword = '';
      this.confirmPassword = '';
      this.currentPassword = '';
      this.profile.update((pr) => (pr ? { ...pr, hasPassword: true } : pr));
      this.passwordSuccess.set(hadPassword ? 'Password updated.' : 'Password saved. You can sign in with email or mobile and this password.');
      setTimeout(() => this.passwordSuccess.set(''), 5000);
    } catch (err: unknown) {
      this.passwordError.set(this.httpErrorMessage(err));
    } finally {
      this.passwordSaving.set(false);
    }
  }
}
