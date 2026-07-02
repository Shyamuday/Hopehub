import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../../services/store-api.service';
import { MedicineWithStock, StoreRack } from '../../models';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { PAGE_SIZES } from '../../core/constants/pagination.constants';

@Component({
  selector: 'app-stock-in',
  imports: [FormsModule],
  templateUrl: './stock-in.component.html',
  styleUrl: './stock-in.component.scss'
})
export class StockInComponent implements OnInit {
  private api = inject(StoreApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  medicineSearch = '';
  searchResults = signal<MedicineWithStock[]>([]);
  selectedMedicine = signal<MedicineWithStock | null>(null);
  searching = signal(false);
  racks = signal<StoreRack[]>([]);
  loading = signal(false);
  error = signal('');
  success = signal('');

  today = new Date().toISOString().split('T')[0];

  form = {
    batchNumber: '',
    manufacturer: '',
    qty: 0,
    expiryDate: '',
    purchasePriceRs: 0,
    sellingPriceRs: 0,
    rackId: '',
    note: ''
  };

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.api.getRacks().subscribe({ next: (r) => this.racks.set(r.racks) });

    const preselect = this.route.snapshot.queryParamMap.get('medicineId');
    if (preselect) {
      this.api.getMedicine(preselect).subscribe({
        next: (res) => {
          if (res.medicine) this.selectedMedicine.set(res.medicine);
        }
      });
    }
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (!this.medicineSearch.trim()) {
      this.searchResults.set([]);
      return;
    }
    this.searching.set(true);
    this.searchTimer = setTimeout(() => {
      this.api.getMedicines({ q: this.medicineSearch, pageSize: PAGE_SIZES.STOCK_LOOKUP }).subscribe({
        next: (res) => {
          this.searchResults.set(res.medicines);
          this.searching.set(false);
        },
        error: () => this.searching.set(false)
      });
    }, 300);
  }

  selectMedicine(m: MedicineWithStock): void {
    this.selectedMedicine.set(m);
    this.searchResults.set([]);
    this.medicineSearch = '';
  }

  clearMedicine(): void {
    this.selectedMedicine.set(null);
    this.searchResults.set([]);
    this.medicineSearch = '';
  }

  isValid(): boolean {
    return !!(this.selectedMedicine() && this.form.batchNumber && this.form.qty > 0 &&
      this.form.expiryDate && this.form.purchasePriceRs >= 0 && this.form.sellingPriceRs >= 0);
  }

  marginPercent(): number {
    if (!this.form.purchasePriceRs) return 0;
    return ((this.form.sellingPriceRs - this.form.purchasePriceRs) / this.form.purchasePriceRs) * 100;
  }

  submit(): void {
    if (!this.isValid()) return;
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    const med = this.selectedMedicine()!;
    this.api.addStock({
      medicineId: med.id,
      qty: this.form.qty,
      batchNumber: this.form.batchNumber,
      expiryDate: this.form.expiryDate,
      purchasePricePerUnit: Math.round(this.form.purchasePriceRs * 100),
      sellingPricePerUnit: Math.round(this.form.sellingPriceRs * 100),
      rackId: this.form.rackId || undefined,
      note: this.form.note || undefined
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(`Successfully added ${this.form.qty} bottles of ${med.name} ${med.potency}`);
        this.clearMedicine();
        this.form = { batchNumber: '', manufacturer: '', qty: 0, expiryDate: '', purchasePriceRs: 0, sellingPriceRs: 0, rackId: '', note: '' };
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to add stock');
      }
    });
  }

  goBack(): void { this.router.navigate(['/', ROUTE_PATHS.DASHBOARD]); }
}
