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
  templateUrl: './rack-map.component.html',
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
