import { CommonModule } from '@angular/common';
import { Component, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../environments/environment';
import { type AuthService } from './auth/auth.service';

type Profile = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  chronicConditions?: string | null;
};

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .profile-panel {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 1.5rem;
      max-width: 560px;
    }
    h2 { font-size: 1.1rem; margin: 0 0 1.25rem; }
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
    .save-row { display: flex; align-items: center; gap: .75rem; margin-top: 1rem; }
    .btn-save {
      background: #2563eb; color: #fff; border: none; border-radius: 9px;
      padding: .6rem 1.25rem; font-size: .9rem; font-weight: 700; cursor: pointer;
      &:hover:not(:disabled) { background: #1d4ed8; }
      &:disabled { opacity: .55; cursor: not-allowed; }
    }
    .msg-ok { color: #16a34a; font-size: .83rem; font-weight: 600; }
    .msg-err { color: #dc2626; font-size: .83rem; }
    .loading-text { color: #6b7280; font-size: .875rem; }
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

        <div class="save-row">
          <button class="btn-save" type="button" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save Profile' }}
          </button>
          @if (successMsg()) { <span class="msg-ok">✓ {{ successMsg() }}</span> }
          @if (errorMsg()) { <span class="msg-err">{{ errorMsg() }}</span> }
        </div>
      }
    </div>
  `
})
export class PatientProfileComponent implements OnInit {
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly successMsg = signal('');
  readonly errorMsg = signal('');
  readonly profile = signal<Profile | null>(null);

  name = '';
  allergies = '';
  currentMedications = '';
  chronicConditions = '';

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
    if (!res.ok) throw new Error((await res.json())?.message || 'Request failed');
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
          chronicConditions: this.chronicConditions.trim() || undefined
        })
      });
      this.profile.set(profile);
      this.successMsg.set('Profile saved.');
      setTimeout(() => this.successMsg.set(''), 3000);
    } catch (err: any) {
      this.errorMsg.set(err?.message || 'Could not save profile.');
    } finally {
      this.saving.set(false);
    }
  }
}
