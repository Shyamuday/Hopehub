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
  styles: [`
    .page-content { padding: 16px; padding-bottom: 88px; overflow-y: auto; height: 100%; }

    .back-btn {
      background: none;
      border: none;
      color: #0891b2;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .med-header-card {
      background: linear-gradient(135deg, rgba(8,145,178,0.15), rgba(14,116,144,0.1));
      border: 1px solid rgba(8,145,178,0.25);
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 14px;
    }

    .med-header-top {
      display: flex;
      gap: 14px;
      margin-bottom: 18px;
    }

    .med-avatar {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(135deg, #0891b2, #0e7490);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .med-header-info {
      flex: 1;
      min-width: 0;
      h1 { font-size: 19px; font-weight: 800; line-height: 1.2; }
    }

    .alt-name { font-size: 13px; color: #64748b; margin: 3px 0 6px; }
    .med-header-badges { display: flex; gap: 6px; flex-wrap: wrap; }

    .stock-summary {
      display: flex;
      align-items: center;
      background: rgba(0,0,0,0.2);
      border-radius: 14px;
      padding: 14px;
      gap: 0;
    }

    .stock-item { flex: 1; text-align: center; }
    .stock-val { font-size: 22px; font-weight: 800; color: white; line-height: 1; }
    .stock-lbl { font-size: 11px; color: #64748b; margin-top: 4px; }
    .stock-divider { width: 1px; height: 36px; background: rgba(255,255,255,0.08); }
    .teal { color: #06b6d4; }
    .yellow { color: #f59e0b; }
    .green { color: #10b981; }
    .red { color: #ef4444; }

    .location-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 14px;
    }

    .location-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .location-path {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .path-node {
      background: rgba(255,255,255,0.08);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      &.highlight { background: rgba(8,145,178,0.2); color: #06b6d4; }
    }
    .path-arrow { color: #475569; font-size: 16px; }
    .location-sublabel { font-size: 12px; color: #64748b; margin-top: 8px; }

    .qr-section {
      text-align: center;
      margin-bottom: 14px;
      padding: 20px;
      background: rgba(255,255,255,0.04);
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.07);
    }

    .qr-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .qr-wrap {
      display: inline-block;
      background: white;
      padding: 10px;
      border-radius: 12px;
    }
    .qr-img { width: 160px; height: 160px; display: block; }
    .qr-id { font-size: 11px; color: #475569; margin-top: 10px; font-family: monospace; }

    .info-card {
      margin-bottom: 14px;
      h3 { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
    }

    .info-grid { display: flex; flex-direction: column; gap: 10px; }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      &.full { flex-direction: column; }
    }
    .info-lbl { font-size: 13px; color: #64748b; flex-shrink: 0; }
    .info-val { font-size: 14px; color: white; font-weight: 500; text-align: right; }

    .action-buttons {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      a { flex: 1; text-decoration: none; justify-content: center; }
    }

    .section { margin-bottom: 20px; }
    .section-title { font-size: 15px; font-weight: 700; margin-bottom: 12px; }

    .batches-list { display: flex; flex-direction: column; gap: 10px; }

    .batch-card {
      background: rgba(255,255,255,0.04);
      border-radius: 14px;
      padding: 14px;
      border: 1px solid rgba(255,255,255,0.06);
      &.batch-expired { border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.04); }
      &.batch-expiring { border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.04); }
    }

    .batch-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .batch-number { font-size: 14px; font-weight: 700; }
    .batch-expiry-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      &.expired { background: rgba(239,68,68,0.15); color: #f87171; }
      &.expiring { background: rgba(245,158,11,0.15); color: #fcd34d; }
      &.ok { background: rgba(16,185,129,0.15); color: #34d399; }
    }

    .batch-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .batch-stat { text-align: center; }
    .batch-val { font-size: 14px; font-weight: 700; color: white; }
    .batch-lbl { font-size: 11px; color: #64748b; }
    .batch-mfr { font-size: 12px; color: #64748b; margin-top: 8px; }

    .error-card {
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      p { color: #f87171; margin-bottom: 12px; }
    }

    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `]
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
