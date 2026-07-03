import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { InsuranceApiService } from '../../services/insurance-api.service';

function formatPaise(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function emptyClaimForm() {
  return { patientId: '', amountRupees: '', description: '' };
}

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [FormField],
  templateUrl: './claims.component.html',
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

  readonly claimFormModel = signal(emptyClaimForm());
  readonly claimForm = form(this.claimFormModel);

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
    const form = this.claimFormModel();
    const amount = Math.round(parseFloat(form.amountRupees) * 100);
    if (!form.patientId.trim() || !amount || amount < 1) {
      this.toast.set('Patient ID and valid amount required');
      setTimeout(() => this.toast.set(''), 2500);
      return;
    }
    this.submitting.set(true);
    try {
      await this.api.createClaim({
        patientId: form.patientId.trim(),
        claimAmountInPaise: amount,
        description: form.description || undefined
      });
      this.showForm.set(false);
      this.claimFormModel.set(emptyClaimForm());
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
