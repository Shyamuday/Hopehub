import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CoordinatorApiService } from '../../services/coordinator-api.service';

@Component({
  selector: 'app-follow-ups',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './follow-ups.component.html',
  styleUrl: './follow-ups.component.scss'
})
export class FollowUpsComponent implements OnInit {
  private api = inject(CoordinatorApiService);

  loading = signal(true);
  error = signal('');
  days = 7;
  data = signal<any>(null);
  activeTab = signal<'HIGH_RISK' | 'MEDIUM_RISK' | 'ON_TRACK' | 'ALERTS'>('HIGH_RISK');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getFollowUps(this.days)
      .then((res) => {
        this.data.set(res);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load follow-up cohorts.');
        this.loading.set(false);
      });
  }

  cohort(tab: 'HIGH_RISK' | 'MEDIUM_RISK' | 'ON_TRACK') {
    return this.data()?.cohorts?.[tab] ?? [];
  }

  activeCohortRows() {
    const tab = this.activeTab();
    if (tab === 'ALERTS') return [];
    return this.cohort(tab);
  }
}
