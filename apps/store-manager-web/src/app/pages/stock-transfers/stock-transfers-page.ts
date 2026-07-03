import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';

@Component({
  selector: 'app-stock-transfers-page',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './stock-transfers-page.html',
  styleUrl: './stock-transfers-page.scss'
})
export class StockTransfersPage implements OnInit {
  private api = inject(StoreApiService);

  loading = signal(true);
  error = signal('');
  transfers = signal<any[]>([]);
  receivingId = signal<string | null>(null);
  toast = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getStockTransfers('IN_TRANSIT').subscribe({
      next: (res) => {
        this.transfers.set(res.transfers ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load incoming transfers.');
        this.loading.set(false);
      }
    });
  }

  submitReceive(id: string): void {
    this.receivingId.set(id);
    this.api.postStockTransferReceive(id).subscribe({
      next: () => {
        this.toast.set('Transfer received — stock updated');
        setTimeout(() => this.toast.set(''), 2500);
        this.receivingId.set(null);
        this.load();
      },
      error: (err) => {
        this.toast.set(err.error?.message || 'Receive failed');
        setTimeout(() => this.toast.set(''), 3000);
        this.receivingId.set(null);
      }
    });
  }
}
