import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BranchOwnerApiService } from '../../services/branch-owner-api.service';

function formatPaise(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private api = inject(BranchOwnerApiService);

  loading = signal(true);
  error = signal('');
  selectedMonth = new Date().toISOString().slice(0, 7);
  data = signal<any>(null);

  readonly formatPaise = formatPaise;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getDashboard(this.selectedMonth)
      .then((res) => {
        this.data.set(res);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load branch dashboard. Check your connection and try again.');
        this.loading.set(false);
      });
  }
}
