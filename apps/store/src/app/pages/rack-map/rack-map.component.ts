import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreApiService } from '../../services/store-api.service';
import { StoreRack } from '../../models';

type RackWithMedicines = StoreRack & {
  medicineCount: number;
  medicines: { id: string; name: string; potency: string; currentQty: number; status: string }[];
};

@Component({
  selector: 'app-rack-map',
  imports: [RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">🗺️ Rack Map</h1>
        <p class="page-sub">Visual store layout — click a rack to see contents</p>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner-big"></div>
          <p>Loading rack map...</p>
        </div>
      } @else if (racks().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🏗️</div>
          <h3>No racks set up yet</h3>
          <p>Ask your manager to add rack locations.</p>
        </div>
      } @else {
        <!-- Rack grid grouped by rack code -->
        <div class="rack-groups">
          @for (group of groupedRacks(); track group.rackCode) {
            <div class="rack-group">
              <div class="rack-header">
                <span class="rack-label">Rack {{ group.rackCode }}</span>
                <span class="rack-count">{{ group.racks.length }} locations</span>
              </div>
              <div class="rack-grid">
                @for (rack of group.racks; track rack.id) {
                  <button
                    class="rack-cell"
                    [class.selected]="selectedRack()?.id === rack.id"
                    [class.populated]="rack.medicineCount > 0"
                    [style.border-color]="getPotencyColor(rack.potencyColor)"
                    (click)="toggleRack(rack)">
                    <div class="cell-code">{{ rack.boxCode }}</div>
                    <div class="cell-shelf">S{{ rack.shelfCode }}</div>
                    <div class="cell-count" [class.populated]="rack.medicineCount > 0">
                      {{ rack.medicineCount }}
                    </div>
                    @if (rack.potencyColor) {
                      <div class="cell-dot" [style.background]="getPotencyColor(rack.potencyColor)"></div>
                    }
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <!-- Selected rack details -->
        @if (selectedRack()) {
          <div class="rack-detail">
            <div class="detail-header">
              <div>
                <div class="detail-title">Rack {{ selectedRack()!.rackCode }} → Shelf {{ selectedRack()!.shelfCode }} → Box {{ selectedRack()!.boxCode }}</div>
                @if (selectedRack()!.label) {
                  <div class="detail-label">{{ selectedRack()!.label }}</div>
                }
              </div>
              <button class="close-btn" (click)="selectedRack.set(null)">✕</button>
            </div>

            @if (selectedRack()!.potencyColor) {
              <div class="potency-row">
                <span class="potency-dot" [style.background]="getPotencyColor(selectedRack()!.potencyColor)"></span>
                <span class="potency-name">{{ potencyLabel(selectedRack()!.potencyColor) }}</span>
              </div>
            }

            @if (selectedRack()!.medicines.length === 0) {
              <div class="detail-empty">📭 This location is empty</div>
            } @else {
              <div class="med-list">
                @for (m of selectedRack()!.medicines; track m.id) {
                  <a class="med-row" [routerLink]="['/medicine', m.id]">
                    <div class="med-info">
                      <span class="med-name">{{ m.name }}</span>
                      <span class="med-potency">{{ m.potency }}</span>
                    </div>
                    <div class="med-qty" [class.low]="m.status === 'LOW_STOCK'" [class.zero]="m.status === 'OUT_OF_STOCK'">
                      {{ m.currentQty }}
                    </div>
                  </a>
                }
              </div>
            }
          </div>
        }

        <!-- Legend -->
        <div class="legend">
          <div class="legend-title">Potency Color Code</div>
          <div class="legend-items">
            @for (item of potencyLegend; track item.label) {
              <div class="legend-item">
                <span class="legend-dot" [style.background]="item.color"></span>
                <span class="legend-label">{{ item.label }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
      color: white;
    }

    .page-header {
      margin-bottom: 24px;
      .page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .page-sub { font-size: 14px; color: #64748b; margin: 0; }
    }

    .loading-state, .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #64748b;
      p { margin-top: 16px; font-size: 14px; }
      .empty-icon { font-size: 48px; margin-bottom: 16px; }
      h3 { color: white; font-size: 18px; margin: 0 0 8px; }
    }

    .spinner-big {
      width: 40px; height: 40px;
      border: 3px solid rgba(8,145,178,0.2);
      border-top-color: #0891b2;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .rack-groups { display: flex; flex-direction: column; gap: 20px; }

    .rack-group {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 16px;
    }

    .rack-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;

      .rack-label { font-size: 16px; font-weight: 800; color: white; }
      .rack-count { font-size: 13px; color: #64748b; }
    }

    .rack-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
      gap: 8px;
    }

    .rack-cell {
      aspect-ratio: 1;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;

      &:hover { background: rgba(255,255,255,0.07); transform: scale(1.05); }

      &.populated {
        background: rgba(8,145,178,0.06);
        border-color: rgba(8,145,178,0.2);
      }

      &.selected {
        background: rgba(8,145,178,0.15);
        border-color: #0891b2;
        box-shadow: 0 0 0 2px rgba(8,145,178,0.3);
      }
    }

    .cell-code { font-size: 13px; font-weight: 800; color: white; }
    .cell-shelf { font-size: 10px; color: #64748b; }
    .cell-count {
      font-size: 11px;
      font-weight: 700;
      color: #475569;

      &.populated { color: #06b6d4; }
    }

    .cell-dot {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .rack-detail {
      margin-top: 20px;
      background: rgba(8,145,178,0.06);
      border: 1px solid rgba(8,145,178,0.2);
      border-radius: 18px;
      padding: 18px;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;

      .detail-title { font-size: 15px; font-weight: 800; color: white; }
      .detail-label { font-size: 13px; color: #64748b; margin-top: 2px; }
    }

    .close-btn {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
      background: transparent; color: #64748b; cursor: pointer; font-size: 14px;
      &:hover { background: rgba(239,68,68,0.1); color: #f87171; }
    }

    .potency-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      .potency-dot { width: 10px; height: 10px; border-radius: 50%; }
      .potency-name { font-size: 13px; color: #94a3b8; }
    }

    .detail-empty {
      font-size: 14px;
      color: #475569;
      text-align: center;
      padding: 20px;
    }

    .med-list { display: flex; flex-direction: column; gap: 6px; }

    .med-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      text-decoration: none;
      transition: all 0.15s;

      &:hover { background: rgba(255,255,255,0.08); }
    }

    .med-info { display: flex; align-items: center; gap: 10px; }
    .med-name { font-size: 14px; font-weight: 600; color: white; }
    .med-potency { padding: 2px 8px; border-radius: 6px; background: rgba(8,145,178,0.15); color: #06b6d4; font-size: 12px; font-weight: 600; }
    .med-qty { font-size: 16px; font-weight: 800; color: #4ade80; &.low { color: #f97316; } &.zero { color: #f87171; } }

    .legend {
      margin-top: 24px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      padding: 14px 16px;

      .legend-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
      .legend-items { display: flex; flex-wrap: wrap; gap: 12px; }
      .legend-item { display: flex; align-items: center; gap: 6px; }
      .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
      .legend-label { font-size: 13px; color: #94a3b8; }
    }
  `]
})
export class RackMapComponent implements OnInit {
  private api = inject(StoreApiService);

  racks = signal<RackWithMedicines[]>([]);
  loading = signal(true);
  selectedRack = signal<RackWithMedicines | null>(null);

  potencyLegend = [
    { color: '#3b82f6', label: '30C (Blue)' },
    { color: '#22c55e', label: '200C (Green)' },
    { color: '#ef4444', label: '1M (Red)' },
    { color: '#eab308', label: 'Q / Mother Tincture (Yellow)' },
    { color: '#a855f7', label: '10M (Purple)' },
    { color: '#f97316', label: 'CM (Orange)' }
  ];

  ngOnInit(): void {
    this.api.getRacks().subscribe({
      next: (res) => {
        this.racks.set(res.racks as never);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  groupedRacks = computed(() => {
    const map = new Map<string, { rackCode: string; racks: RackWithMedicines[] }>();
    for (const rack of this.racks()) {
      if (!map.has(rack.rackCode)) {
        map.set(rack.rackCode, { rackCode: rack.rackCode, racks: [] });
      }
      map.get(rack.rackCode)!.racks.push(rack);
    }
    return Array.from(map.values()).sort((a, b) => a.rackCode.localeCompare(b.rackCode));
  });

  toggleRack(rack: RackWithMedicines): void {
    this.selectedRack.set(this.selectedRack()?.id === rack.id ? null : rack);
  }

  getPotencyColor(color?: string | null): string {
    const map: Record<string, string> = {
      blue: '#3b82f6', green: '#22c55e', red: '#ef4444',
      yellow: '#eab308', purple: '#a855f7', orange: '#f97316'
    };
    return color ? (map[color] ?? '#475569') : '#475569';
  }

  potencyLabel(color?: string | null): string {
    const map: Record<string, string> = {
      blue: '30C', green: '200C', red: '1M',
      yellow: 'Q / Mother Tincture', purple: '10M', orange: 'CM'
    };
    return color ? (map[color] ?? color ?? '') : '';
  }
}
