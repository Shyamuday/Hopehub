import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CorporateWellnessApiService } from '../../services/corporate-wellness-api.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  templateUrl: './accounts.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './accounts.component.scss'
})
export class AccountsComponent implements OnInit {
  private api = inject(CorporateWellnessApiService);

  loading = signal(true);
  error = signal('');
  accounts = signal<any[]>([]);
  selectedId = signal<string | null>(null);
  enrollments = signal<any[]>([]);
  enrollmentsLoading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getAccounts()
      .then((res) => {
        this.accounts.set(res.accounts ?? []);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load corporate accounts.');
        this.loading.set(false);
      });
  }

  openAccount(id: string): void {
    this.selectedId.set(id);
    this.enrollmentsLoading.set(true);
    this.api.getEnrollments(id)
      .then((res) => {
        this.enrollments.set(res.enrollments ?? []);
        this.enrollmentsLoading.set(false);
      })
      .catch(() => {
        this.enrollments.set([]);
        this.enrollmentsLoading.set(false);
      });
  }

  closeDetail(): void {
    this.selectedId.set(null);
    this.enrollments.set([]);
  }
}
