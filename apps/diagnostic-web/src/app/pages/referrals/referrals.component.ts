import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DiagnosticApiService } from '../../services/diagnostic-api.service';

type ResultLine = {
  lineId: string;
  testName: string;
  resultSummary: string;
  resultFileUrl: string;
};

@Component({
  selector: 'app-referrals',
  standalone: true,
  imports: [FormsModule, DatePipe],
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
  partnerNotes = '';
  expectedResultDate = '';

  resultsId = signal<string | null>(null);
  resultLines = signal<ResultLine[]>([]);

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
    this.partnerNotes = referral.partnerNotes ?? '';
    this.expectedResultDate = referral.expectedResultDate?.slice(0, 10) ?? '';
  }

  closeAccept(): void {
    this.acceptingId.set(null);
    this.partnerNotes = '';
    this.expectedResultDate = '';
  }

  async submitAccept(id: string): Promise<void> {
    try {
      await this.api.acceptReferral(id, {
        partnerNotes: this.partnerNotes || undefined,
        expectedResultDate: this.expectedResultDate || undefined
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
    this.resultLines.set(
      referral.lines.map((line: any) => ({
        lineId: line.id,
        testName: line.testName,
        resultSummary: line.resultSummary ?? '',
        resultFileUrl: line.resultFileUrl ?? ''
      }))
    );
  }

  closeResults(): void {
    this.resultsId.set(null);
    this.resultLines.set([]);
  }

  async submitResults(): Promise<void> {
    const id = this.resultsId();
    if (!id) return;
    const lines = this.resultLines()
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
