import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReceptionApiService } from '../../services/reception-api.service';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';

@Component({
  selector: 'app-walk-in',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './walk-in.component.html',
  styleUrl: './walk-in.component.scss'
})
export class WalkInComponent implements OnInit {
  private api = inject(ReceptionApiService);
  private router = inject(Router);

  diseases = signal<Array<{ id: string; name: string; feeInPaise: number }>>([]);
  loading = signal(false);
  error = signal('');
  toast = signal('');

  form = {
    name: '',
    mobile: '',
    email: '',
    diseaseId: '',
    collectCash: true,
    notes: ''
  };

  ngOnInit(): void {
    this.api.getDiseases()
      .then(r => this.diseases.set(r.diseases ?? []))
      .catch(() => this.error.set('Could not load diseases.'));
  }

  formatPaise(paise: number): string {
    return (paise / 100).toLocaleString('en-IN');
  }

  async submit(): Promise<void> {
    if (!this.form.name || !this.form.mobile || !this.form.diseaseId) {
      this.error.set('Name, mobile, and concern are required.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      await this.api.walkIn({
        name: this.form.name,
        mobile: this.form.mobile,
        email: this.form.email || null,
        diseaseId: this.form.diseaseId,
        collectCash: this.form.collectCash,
        notes: this.form.notes || undefined
      });
      this.toast.set('Walk-in registered');
      setTimeout(() => this.router.navigate([`/${ROUTE_PATHS.QUEUE}`]), 800);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? e?.error?.message ?? 'Registration failed.');
    } finally {
      this.loading.set(false);
    }
  }
}
