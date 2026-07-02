import { Component, inject, signal, OnInit } from '@angular/core';
import { StoreApiService } from '../../services/store-api.service';
import { StockMovement } from '../../models';
import { DatePipe } from '@angular/common';

const TYPE_ICONS: Record<string, string> = {
  PURCHASE_IN: '📦', SALE_OUT: '🛒',
  ADJUSTMENT_IN: '➕', ADJUSTMENT_OUT: '✏️',
  TRANSFER_IN: '↙️', TRANSFER_OUT: '↗️', EXPIRED_REMOVAL: '🗑️'
};
const TYPE_LABELS: Record<string, string> = {
  PURCHASE_IN: 'Purchase In', SALE_OUT: 'Sale Out',
  ADJUSTMENT_IN: 'Adjustment In', ADJUSTMENT_OUT: 'Adjustment Out',
  TRANSFER_IN: 'Transfer In', TRANSFER_OUT: 'Transfer Out', EXPIRED_REMOVAL: 'Expired Removal'
};
const TYPE_COLORS: Record<string, string> = {
  PURCHASE_IN: '#4ade80', ADJUSTMENT_IN: '#4ade80', TRANSFER_IN: '#4ade80',
  SALE_OUT: '#60a5fa', ADJUSTMENT_OUT: '#fb923c', TRANSFER_OUT: '#fb923c', EXPIRED_REMOVAL: '#f87171'
};

@Component({
  selector: 'app-movements',
  imports: [DatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">📋 Movement History</h1>
        <p class="page-sub">All stock in/out transactions</p>
      </div>

      @if (loading() && movements().length === 0) {
        <div class="loading-state"><div class="spinner-big"></div></div>
      } @else if (movements().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No movements yet</h3>
          <p>Stock transactions will appear here.</p>
        </div>
      } @else {
        <div class="movement-list">
          @for (m of movements(); track m.id) {
            <div class="movement-card">
              <div class="movement-icon">{{ typeIcon(m.type) }}</div>
              <div class="movement-info">
                <div class="movement-medicine">{{ m.medicineName }} <span class="potency">{{ m.potency }}</span></div>
                <div class="movement-meta">
                  <span class="type-badge" [style.color]="typeColor(m.type)">{{ typeLabel(m.type) }}</span>
                  @if (m.staffName) { <span class="staff">by {{ m.staffName }}</span> }
                  @if (m.note) { <span class="note">"{{ m.note }}"</span> }
                </div>
                <div class="movement-time">{{ m.createdAt | date:'dd MMM yyyy, h:mm a' }}</div>
              </div>
              <div class="movement-qty" [style.color]="typeColor(m.type)">
                {{ isOut(m.type) ? '−' : '+' }}{{ m.qty }}
              </div>
            </div>
          }
        </div>

        @if (hasMore()) {
          <div class="load-more-wrap">
            <button class="load-more-btn" [disabled]="loading()" (click)="loadMore()">
              @if (loading()) { <span class="btn-spinner"></span> Loading... } @else { Load More }
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 20px; max-width: 720px; margin: 0 auto; color: white; }
    .page-header { margin-bottom: 24px; .page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; } .page-sub { font-size: 14px; color: #64748b; margin: 0; } }

    .loading-state, .empty-state { text-align: center; padding: 60px 20px; .empty-icon { font-size: 48px; margin-bottom: 16px; } h3 { color: white; font-size: 18px; margin: 0 0 8px; } p { color: #64748b; font-size: 14px; margin: 0; } }
    .spinner-big { width: 40px; height: 40px; border: 3px solid rgba(8,145,178,0.2); border-top-color: #0891b2; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .movement-list { display: flex; flex-direction: column; gap: 10px; }

    .movement-card {
      display: flex; align-items: center; gap: 14px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px; padding: 14px 16px; transition: all 0.15s;
      &:hover { background: rgba(255,255,255,0.05); }
    }

    .movement-icon { font-size: 24px; flex-shrink: 0; width: 36px; text-align: center; }

    .movement-info { flex: 1; min-width: 0; }
    .movement-medicine { font-size: 14px; font-weight: 700; color: white; margin-bottom: 4px; }
    .potency { padding: 1px 7px; border-radius: 5px; background: rgba(8,145,178,0.15); color: #06b6d4; font-size: 11px; font-weight: 600; margin-left: 6px; }
    .movement-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 4px; }
    .type-badge { font-size: 12px; font-weight: 600; }
    .staff, .note { font-size: 12px; color: #64748b; }
    .note { font-style: italic; }
    .movement-time { font-size: 11px; color: #475569; }

    .movement-qty { font-size: 18px; font-weight: 800; flex-shrink: 0; }

    .load-more-wrap { text-align: center; margin-top: 20px; }
    .load-more-btn { padding: 12px 28px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #94a3b8; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; &:hover:not(:disabled) { background: rgba(255,255,255,0.06); } &:disabled { opacity: 0.5; } }
    .btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
  `]
})
export class MovementsComponent implements OnInit {
  private api = inject(StoreApiService);

  movements = signal<StockMovement[]>([]);
  loading = signal(true);
  page = signal(1);
  hasMore = signal(false);

  ngOnInit(): void { this.load(); }

  load(append = false): void {
    this.loading.set(true);
    this.api.getMovements(this.page(), 20).subscribe({
      next: (res) => {
        this.movements.update(prev => append ? [...prev, ...res.movements] : res.movements);
        this.hasMore.set(this.page() < res.pagination.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadMore(): void { this.page.update(p => p + 1); this.load(true); }

  typeIcon(type: string): string { return TYPE_ICONS[type] ?? '📝'; }
  typeLabel(type: string): string { return TYPE_LABELS[type] ?? type; }
  typeColor(type: string): string { return TYPE_COLORS[type] ?? '#94a3b8'; }
  isOut(type: string): boolean { return ['SALE_OUT', 'ADJUSTMENT_OUT', 'TRANSFER_OUT', 'EXPIRED_REMOVAL'].includes(type); }
}
