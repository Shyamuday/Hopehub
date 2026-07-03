import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { Auth } from '../../../core/services/auth';
import {
  DEFAULT_LEAVE_TYPE,
  LEAVE_STATUS_FALLBACK_STYLE,
  LEAVE_STATUS_STYLES,
  LEAVE_TYPES
} from '../constants/leave.constants';

function emptyLeaveRequest() {
  return { type: DEFAULT_LEAVE_TYPE, startDate: '', endDate: '', reason: '' };
}

@Component({
  selector: 'app-my-leaves',
  imports: [FormField, DatePipe],
  templateUrl: './my-leaves.html',
  styleUrl: './my-leaves.scss'
})
export class MyLeaves implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private base = environment.apiUrl;

  leaves = signal<any[]>([]);
  loading = signal(true);
  modal = signal(false);
  saving = signal(false);
  err = signal('');
  toast = signal('');

  readonly leaveRequestModel = signal(emptyLeaveRequest());
  readonly leaveRequestForm = form(this.leaveRequestModel);
  leaveTypes = LEAVE_TYPES;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const token = this.auth.token();
    firstValueFrom(
      this.http.get<{ leaves: any[] }>(`${this.base}${API_PATHS.HR.SELF_DOCTOR_LEAVES}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ).then(r => { this.leaves.set(r.leaves); this.loading.set(false); })
     .catch(() => this.loading.set(false));
  }

  openModal(): void {
    this.leaveRequestModel.set(emptyLeaveRequest());
    this.err.set('');
    this.modal.set(true);
  }
  closeModal(): void { this.modal.set(false); }

  async submit(): Promise<void> {
    const form = this.leaveRequestModel();
    if (!form.startDate || !form.endDate) { this.err.set('Start and end dates are required'); return; }
    this.saving.set(true);
    const token = this.auth.token();
    try {
      await firstValueFrom(
        this.http.post(`${this.base}${API_PATHS.HR.SELF_DOCTOR_LEAVE}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      this.modal.set(false);
      this.showToast('Leave request submitted ✓');
      this.load();
    } catch (e: any) {
      this.err.set(e?.error?.error ?? 'Failed to submit request');
    } finally {
      this.saving.set(false);
    }
  }

  statusStyle(s: string): { bg: string; color: string } {
    return LEAVE_STATUS_STYLES[s] ?? LEAVE_STATUS_FALLBACK_STYLE;
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
