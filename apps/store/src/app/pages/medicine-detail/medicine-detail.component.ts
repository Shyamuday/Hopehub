import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';
import { MedicineDetailResponse, StockBatch } from '../../models';

@Component({
  selector: 'app-medicine-detail',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-content">
      <!-- Back button -->
      <button class="back-btn" (click)="goBack()">
        ← Back
      </button>

      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:60px">
          <div class="spinner"></div>
        </div>
      }

      @if (detail(); as d) {
        <div class="fade-in">
          <!-- Medicine header card -->
          <div class="med-header-card">
            <div class="med-header-top">
              <div class="med-avatar">
                {{ d.medicine.name.charAt(0).toUpperCase() }}
              </div>
              <div class="med-header-info">
                <h1>{{ d.medicine.name }}</h1>
                @if (d.medicine.alternateName) {
                  <div class="alt-name">{{ d.medicine.alternateName }}</div>
                }
                <div class="med-header-badges">
                  <span class="badge" [class]="getPotencyClass(d.medicine.potency)">
                    {{ d.medicine.potency }}
                  </span>
                  <span class="badge" [class]="getStatusBadge(d.medicine.status)">
                    {{ d.medicine.status.replace('_', ' ') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Stock summary -->
            <div class="stock-summary">
              <div class="stock-item">
                <div class="stock-val" [class]="getQtyColor(d.medicine.currentQty, d.medicine.minStockLevel)">
                  {{ d.medicine.currentQty }}
                </div>
                <div class="stock-lbl">Current Qty</div>
              </div>
              <div class="stock-divider"></div>
              <div class="stock-item">
                <div class="stock-val yellow">{{ d.medicine.minStockLevel }}</div>
                <div class="stock-lbl">Min Level</div>
              </div>
              <div class="stock-divider"></div>
              <div class="stock-item">
                <div class="stock-val">{{ d.batches.length }}</div>
                <div class="stock-lbl">Batches</div>
              </div>
            </div>
          </div>

          <!-- Location breadcrumb -->
          @if (d.location) {
            <div class="location-card">
              <div class="location-label">📍 Location</div>
              <div class="location-path">
                <span class="path-node">Rack {{ d.location.rackCode }}</span>
                <span class="path-arrow">→</span>
                <span class="path-node">Shelf {{ d.location.shelfCode }}</span>
                <span class="path-arrow">→</span>
                <span class="path-node highlight">Box {{ d.location.boxCode }}</span>
              </div>
              @if (d.location.label) {
                <div class="location-sublabel">{{ d.location.label }}</div>
              }
            </div>
          }

          <!-- QR Code -->
          <div class="qr-section">
            <div class="qr-label">QR Code</div>
            <div class="qr-wrap">
              <img
                class="qr-img"
                [src]="'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + d.medicine.id"
                alt="QR Code"
                loading="lazy"
              />
            </div>
            <div class="qr-id">{{ d.medicine.id }}</div>
          </div>

          <!-- Medicine info -->
          <div class="card info-card">
            <h3>Medicine Info</h3>
            <div class="info-grid">
              @if (d.medicine.manufacturer) {
                <div class="info-row">
                  <span class="info-lbl">Manufacturer</span>
                  <span class="info-val">{{ d.medicine.manufacturer }}</span>
                </div>
              }
              @if (d.medicine.category) {
                <div class="info-row">
                  <span class="info-lbl">Category</span>
                  <span class="info-val">{{ d.medicine.category }}</span>
                </div>
              }
              @if (d.medicine.shortName) {
                <div class="info-row">
                  <span class="info-lbl">Short Name</span>
                  <span class="info-val">{{ d.medicine.shortName }}</span>
                </div>
              }
              @if (d.medicine.description) {
                <div class="info-row full">
                  <span class="info-lbl">Description</span>
                  <span class="info-val">{{ d.medicine.description }}</span>
                </div>
              }
              <div class="info-row">
                <span class="info-lbl">Added</span>
                <span class="info-val">{{ d.medicine.createdAt | date:'dd MMM yyyy' }}</span>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="action-buttons">
            <a class="btn btn-primary" [routerLink]="['/stock-in']" [queryParams]="{medicineId: d.medicine.id}">
              📦 Add Stock
            </a>
            <a class="btn btn-secondary" [routerLink]="['/stock-out']" [queryParams]="{medicineId: d.medicine.id, stockId: d.medicine.stockId}">
              📤 Remove Stock
            </a>
          </div>

          <!-- Batches -->
          @if (d.batches.length > 0) {
            <div class="section">
              <h3 class="section-title">📋 Stock Batches</h3>
              <div class="batches-list">
                @for (batch of d.batches; track batch.id) {
                  <div class="batch-card" [class]="getBatchClass(batch)">
                    <div class="batch-top">
                      <div class="batch-number">{{ batch.batchNumber }}</div>
                      <div class="batch-expiry-badge" [class]="getExpiryBadgeClass(batch)">
                        {{ getExpiryLabel(batch) }}
                      </div>
                    </div>
                    <div class="batch-grid">
                      <div class="batch-stat">
                        <div class="batch-val">{{ batch.qty }}</div>
                        <div class="batch-lbl">Units</div>
                      </div>
                      <div class="batch-stat">
                        <div class="batch-val">₹{{ batch.sellingPricePerUnit }}</div>
                        <div class="batch-lbl">Sell Price</div>
                      </div>
                      <div class="batch-stat">
                        <div class="batch-val">{{ batch.expiryDate | date:'MMM yyyy' }}</div>
                        <div class="batch-lbl">Expiry</div>
                      </div>
                    </div>
                    @if (batch.manufacturer) {
                      <div class="batch-mfr">Mfr: {{ batch.manufacturer }}</div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (error()) {
        <div class="error-card">
          <p>{{ error() }}</p>
          <button class="btn btn-secondary btn-sm" (click)="load()">Retry</button>
        </div>
      }
    </div>
  `,
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
