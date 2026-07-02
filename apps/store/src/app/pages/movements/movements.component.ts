import { Component, inject, signal, OnInit } from '@angular/core';
import { StoreApiService } from '../../services/store-api.service';
import { StockMovement } from '../../models';
import { DatePipe } from '@angular/common';
import { PAGE_SIZES } from '../../core/constants/pagination.constants';
import { STOCK_MOVEMENT_DISPLAY, OUTBOUND_MOVEMENT_TYPES } from '../../shared/constants/stock-movement.constants';

type MovementDisplayKey = keyof typeof STOCK_MOVEMENT_DISPLAY.ICONS;

function movementDisplayKey(type: string): MovementDisplayKey | null {
  if (type === 'EXPIRED_REMOVAL') return 'EXPIRED_OUT';
  return type in STOCK_MOVEMENT_DISPLAY.ICONS ? type as MovementDisplayKey : null;
}

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
  styleUrl: './movements.component.scss'
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
    this.api.getMovements(this.page(), PAGE_SIZES.MOVEMENTS).subscribe({
      next: (res) => {
        this.movements.update(prev => append ? [...prev, ...res.movements] : res.movements);
        this.hasMore.set(this.page() < res.pagination.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadMore(): void { this.page.update(p => p + 1); this.load(true); }

  typeIcon(type: string): string {
    const key = movementDisplayKey(type);
    return key ? STOCK_MOVEMENT_DISPLAY.ICONS[key] : STOCK_MOVEMENT_DISPLAY.FALLBACK.ICON;
  }

  typeLabel(type: string): string {
    const key = movementDisplayKey(type);
    return key ? STOCK_MOVEMENT_DISPLAY.LABELS[key] : type;
  }

  typeColor(type: string): string {
    const key = movementDisplayKey(type);
    return key ? STOCK_MOVEMENT_DISPLAY.COLORS[key] : STOCK_MOVEMENT_DISPLAY.FALLBACK.COLOR;
  }

  isOut(type: string): boolean { return OUTBOUND_MOVEMENT_TYPES.has(type); }
}
