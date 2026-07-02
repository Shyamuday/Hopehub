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
  templateUrl: './movements.component.html',
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
