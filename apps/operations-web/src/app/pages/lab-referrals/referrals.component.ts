import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { DiagnosticApiService } from '../../services/diagnostic-api.service';

type ResultLine = {
  lineId: string;
  testName: string;
  resultSummary: string;
  resultFileUrl: string;
};

function emptyAcceptForm() {
  return { partnerNotes: '', expectedResultDate: '' };
}

function emptyResultsForm() {
  return { lines: [] as ResultLine[] };
}

@Component({
  selector: 'app-referrals',
  standalone: true,
  imports: [FormField, DatePipe],
  templateUrl: './referrals.component.html',
  styleUrl: './referrals.component.scss'
})
export class ReferralsComponent implements OnInit {
  private api = inject(DiagnosticApiService);

  loading = signal(true);
  error = signal('');
  referrals = signal<any[]>([]);
  toast = signal('');

  acceptingId = signal<string | null>(null);
  resultsId = signal<string | null>(null);

  readonly acceptFormModel = signal(emptyAcceptForm());
  readonly acceptForm = form(this.acceptFormModel);
  readonly resultsFormModel = signal(emptyResultsForm());
  readonly resultsForm = form(this.resultsFormModel);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getReferrals()
      .then((res) => {
        this.referrals.set(res.referrals ?? []);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load lab referrals.');
        this.loading.set(false);
      });
  }

  openAccept(referral: any): void {
    this.acceptingId.set(referral.id);
    this.acceptFormModel.set({
      partnerNotes: referral.partnerNotes ?? '',
      expectedResultDate: referral.expectedResultDate?.slice(0, 10) ?? ''
    });
  }

  closeAccept(): void {
    this.acceptingId.set(null);
    this.acceptFormModel.set(emptyAcceptForm());
  }

  async submitAccept(id: string): Promise<void> {
    const form = this.acceptFormModel();
    try {
      await this.api.acceptReferral(id, {
        partnerNotes: form.partnerNotes || undefined,
        expectedResultDate: form.expectedResultDate || undefined
      });
      this.showToast('Referral accepted');
      this.closeAccept();
      this.load();
    } catch {
      this.showToast('Accept failed');
    }
  }

  async advance(id: string, status: 'SAMPLE_COLLECTED' | 'IN_PROGRESS'): Promise<void> {
    try {
      await this.api.advanceReferral(id, status);
      this.showToast(status === 'SAMPLE_COLLECTED' ? 'Sample collected' : 'Processing started');
      this.load();
    } catch {
      this.showToast('Status update failed');
    }
  }

  openResults(referral: any): void {
    this.resultsId.set(referral.id);
    this.resultsFormModel.set({
      lines: referral.lines.map((line: any) => ({
        lineId: line.id,
        testName: line.testName,
        resultSummary: line.resultSummary ?? '',
        resultFileUrl: line.resultFileUrl ?? ''
      }))
    });
  }

  closeResults(): void {
    this.resultsId.set(null);
    this.resultsFormModel.set(emptyResultsForm());
  }

  async submitResults(): Promise<void> {
    const id = this.resultsId();
    if (!id) return;
    const lines = this.resultsFormModel().lines
      .filter((line) => line.resultSummary.trim())
      .map((line) => ({
        lineId: line.lineId,
        resultSummary: line.resultSummary.trim(),
        resultFileUrl: line.resultFileUrl.trim() || undefined
      }));
    if (!lines.length) return;
    try {
      await this.api.submitResults(id, lines);
      this.showToast('Results published');
      this.closeResults();
      this.load();
    } catch {
      this.showToast('Submit results failed');
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
