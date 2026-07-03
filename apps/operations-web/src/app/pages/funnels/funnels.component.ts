import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MarketingApiService } from '../../services/marketing-api.service';

@Component({
  selector: 'app-funnels',
  standalone: true,
  imports: [FormField],
  templateUrl: './funnels.component.html',
  styleUrl: './funnels.component.scss'
})
export class FunnelsComponent implements OnInit {
  private api = inject(MarketingApiService);

  loading = signal(true);
  error = signal('');
  data = signal<any>(null);

  readonly filterModel = signal({ days: '30' });
  readonly filterForm = form(this.filterModel);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getFunnels(Number(this.filterModel().days))
      .then((res) => {
        this.data.set(res);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load funnel analytics.');
        this.loading.set(false);
      });
  }
}
