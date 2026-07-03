import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarketingApiService } from '../../services/marketing-api.service';

@Component({
  selector: 'app-funnels',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './funnels.component.html',
  styleUrl: './funnels.component.scss'
})
export class FunnelsComponent implements OnInit {
  private api = inject(MarketingApiService);

  loading = signal(true);
  error = signal('');
  days = 30;
  data = signal<any>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getFunnels(this.days)
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
