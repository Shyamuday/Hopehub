import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';
import { MedicineDetailResponse, StockBatch } from '../../models';

@Component({
  selector: 'app-medicine-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './medicine-detail.component.html',
  styleUrl: './medicine-detail.component.scss'
})
export class MedicineDetailComponent implements OnInit {
  private api = inject(StoreApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  detail = signal<MedicineDetailResponse | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loading.set(true);
    this.error.set('');
    this.api.getMedicine(id).subscribe({
      next: (data) => { this.detail.set(data); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to load medicine');
      }
    });
  }

  goBack(): void {
    window.history.length > 1 ? window.history.back() : this.router.navigate(['/search']);
  }

  getPotencyClass(potency: string): string {
    const p = potency?.toLowerCase() ?? '';
    if (p.includes('30c')) return 'badge potency-30c';
    if (p.includes('200c')) return 'badge potency-200c';
    if (p.includes('1m') || p.includes('10m')) return 'badge potency-1m';
    if (p.includes('q') || p.includes('mother')) return 'badge potency-q';
    return 'badge potency-other';
  }

  getStatusBadge(status: string): string {
    if (status === 'OUT_OF_STOCK') return 'badge badge-red';
    if (status === 'LOW_STOCK') return 'badge badge-yellow';
    if (status === 'DISCONTINUED') return 'badge badge-gray';
    return 'badge badge-green';
  }

  getQtyColor(qty: number, min: number): string {
    if (qty === 0) return 'red';
    if (qty <= min) return 'yellow';
    return 'green';
  }

  getBatchClass(batch: StockBatch): string {
    if (batch.isExpired) return 'batch-expired';
    if (batch.isExpiringSoon) return 'batch-expiring';
    return '';
  }

  getExpiryBadgeClass(batch: StockBatch): string {
    if (batch.isExpired) return 'expired';
    if (batch.isExpiringSoon) return 'expiring';
    return 'ok';
  }

  getExpiryLabel(batch: StockBatch): string {
    if (batch.isExpired) return 'Expired';
    if (batch.daysToExpiry <= 30) return `${batch.daysToExpiry}d left`;
    if (batch.daysToExpiry <= 90) return `${batch.daysToExpiry}d left`;
    return 'Good';
  }
}
