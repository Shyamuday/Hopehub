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
  styleUrl: './rack-map.component.scss'
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
