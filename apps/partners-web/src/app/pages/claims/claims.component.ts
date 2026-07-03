import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InsuranceApiService } from '../../services/insurance-api.service';

function formatPaise(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './claims.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './claims.component.scss'
})
export class ClaimsComponent implements OnInit {
  private api = inject(InsuranceApiService);

  loading = signal(true);
  error = signal('');
  toast = signal('');
  claims = signal<any[]>([]);
  showForm = signal(false);
  submitting = signal(false);

  form = { patientId: '', amountRupees: '', description: '' };

  readonly formatPaise = formatPaise;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getClaims()
      .then((res) => {
        this.claims.set(res.claims ?? []);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load claims.');
        this.loading.set(false);
      });
  }

  async submitClaim(): Promise<void> {
    const amount = Math.round(parseFloat(this.form.amountRupees) * 100);
    if (!this.form.patientId.trim() || !amount || amount < 1) {
      this.toast.set('Patient ID and valid amount required');
      setTimeout(() => this.toast.set(''), 2500);
      return;
    }
    this.submitting.set(true);
    try {
      await this.api.createClaim({
        patientId: this.form.patientId.trim(),
        claimAmountInPaise: amount,
        description: this.form.description || undefined
      });
      this.showForm.set(false);
      this.form = { patientId: '', amountRupees: '', description: '' };
      this.toast.set('Claim submitted');
      this.load();
    } catch {
      this.toast.set('Submit failed');
    } finally {
      this.submitting.set(false);
      setTimeout(() => this.toast.set(''), 2500);
    }
  }
}
