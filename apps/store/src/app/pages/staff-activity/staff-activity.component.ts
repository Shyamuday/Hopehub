import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';
import { StaffActivity, StaffDetailResponse } from '../../models';

const TYPE_ICONS: Record<string, string> = {
  PURCHASE_IN: '📦', SALE_OUT: '🛒',
  ADJUSTMENT_IN: '➕', ADJUSTMENT_OUT: '✏️',
  TRANSFER_IN: '↙️', TRANSFER_OUT: '↗️', EXPIRED_REMOVAL: '🗑️'
};
const TYPE_LABELS: Record<string, string> = {
  PURCHASE_IN: 'Stock Received', SALE_OUT: 'Dispensed',
  ADJUSTMENT_IN: 'Adj. In', ADJUSTMENT_OUT: 'Adj. Out',
  TRANSFER_IN: 'Transfer In', TRANSFER_OUT: 'Transfer Out',
  EXPIRED_REMOVAL: 'Expired Removed'
};
const TYPE_COLORS: Record<string, string> = {
  PURCHASE_IN: '#4ade80', ADJUSTMENT_IN: '#4ade80', TRANSFER_IN: '#4ade80',
  SALE_OUT: '#60a5fa', ADJUSTMENT_OUT: '#fb923c',
  TRANSFER_OUT: '#fb923c', EXPIRED_REMOVAL: '#f87171'
};

@Component({
  selector: 'app-staff-activity',
  imports: [DatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">👥 Staff Activity</h1>
        <p class="page-sub">Track what every team member is doing</p>
      </div>

      <!-- Period selector -->
      <div class="period-tabs">
        @for (p of periods; track p.value) {
          <button class="period-btn" [class.active]="period() === p.value" (click)="setPeriod(p.value)">
            {{ p.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading-state"><div class="spinner-big"></div></div>
      } @else {

        <!-- Leaderboard row -->
        @if (topThree().length > 0) {
          <div class="leaderboard">
            @for (s of topThree(); track s.staffId; let i = $index) {
              <button class="leader-card" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2"
                      (click)="openDetail(s)">
                <div class="leader-rank">{{ ['🥇','🥈','🥉'][i] }}</div>
                <div class="leader-avatar">{{ s.name.charAt(0).toUpperCase() }}</div>
                <div class="leader-name">{{ s.name }}</div>
                <div class="leader-actions">{{ s.totalActions }} actions</div>
                <div class="leader-qty">
                  <span class="in">+{{ s.totalQtyIn }}</span>
                  <span class="sep">/</span>
                  <span class="out">−{{ s.totalQtyOut }}</span>
                </div>
              </button>
            }
          </div>
        }

        <!-- Full staff table -->
        <div class="staff-list">
          @for (s of staffList(); track s.staffId) {
            <div class="staff-row" (click)="openDetail(s)">
              <div class="staff-left">
                <div class="staff-avatar" [class.manager]="s.role === 'MANAGER'">
                  {{ s.name.charAt(0).toUpperCase() }}
                </div>
                <div class="staff-info">
                  <div class="staff-name">{{ s.name }}</div>
                  <div class="staff-meta">
                    <span class="staff-code">{{ s.staffCode }}</span>
                    <span class="staff-role" [class.manager]="s.role === 'MANAGER'">{{ s.role }}</span>
                  </div>
                </div>
              </div>

              <div class="staff-stats">
                <div class="stat-chip">
                  <span class="stat-num">{{ s.totalActions }}</span>
                  <span class="stat-lbl">actions</span>
                </div>
                <div class="stat-chip in-chip">
                  <span class="stat-num">+{{ s.totalQtyIn }}</span>
                  <span class="stat-lbl">in</span>
                </div>
                <div class="stat-chip out-chip">
                  <span class="stat-num">−{{ s.totalQtyOut }}</span>
                  <span class="stat-lbl">out</span>
                </div>
              </div>

              <div class="activity-bar-wrap">
                @if (maxActions() > 0) {
                  <div class="activity-bar" [style.width.%]="(s.totalActions / maxActions()) * 100"></div>
                }
              </div>

              <div class="chevron">›</div>
            </div>
          }
        </div>

        @if (staffList().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">👤</div>
            <h3>No activity yet</h3>
            <p>No staff movements recorded for this period.</p>
          </div>
        }
      }
    </div>

    <!-- Staff detail drawer -->
    @if (detailOpen() && detail()) {
      <div class="drawer-overlay" (click)="closeDetail()">
        <div class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div class="detail-avatar" [class.manager]="detail()!.staff.role === 'MANAGER'">
              {{ detail()!.staff.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="detail-name">{{ detail()!.staff.name }}</div>
              <div class="detail-meta">
                <span class="staff-code">{{ detail()!.staff.staffCode }}</span>
                <span class="staff-role" [class.manager]="detail()!.staff.role === 'MANAGER'">{{ detail()!.staff.role }}</span>
              </div>
            </div>
            <button class="close-btn" (click)="closeDetail()">✕</button>
          </div>

          <!-- Breakdown cards -->
          <div class="breakdown-grid">
            @for (b of detail()!.breakdown; track b.type) {
              <div class="breakdown-card">
                <div class="bc-icon">{{ typeIcon(b.type) }}</div>
                <div class="bc-info">
                  <div class="bc-label">{{ typeLabel(b.type) }}</div>
                  <div class="bc-stats">
                    <span class="bc-count">{{ b.count }}×</span>
                    <span class="bc-qty" [style.color]="typeColor(b.type)">{{ b.qty }} bottles</span>
                  </div>
                </div>
              </div>
            }
            @if (detail()!.breakdown.length === 0) {
              <div class="no-breakdown">No actions in this period</div>
            }
          </div>

          <!-- Period toggle for detail -->
          <div class="detail-period-row">
            @for (p of periods; track p.value) {
              <button class="period-btn sm" [class.active]="detailPeriod() === p.value" (click)="setDetailPeriod(p.value)">
                {{ p.label }}
              </button>
            }
          </div>

          <!-- Recent movements -->
          <div class="recent-header">Recent Movements</div>
          <div class="recent-list">
            @for (m of detail()!.recentMovements; track m.id) {
              <div class="recent-row">
                <span class="r-icon">{{ typeIcon(m.type) }}</span>
                <div class="r-info">
                  <span class="r-med">{{ m.medicineName }}</span>
                  <span class="r-potency">{{ m.potency }}</span>
                  @if (m.note) { <span class="r-note">"{{ m.note }}"</span> }
                </div>
                <div class="r-right">
                  <span class="r-qty" [style.color]="typeColor(m.type)">
                    {{ isOut(m.type) ? '−' : '+' }}{{ m.qty }}
                  </span>
                  <span class="r-time">{{ m.createdAt | date:'dd MMM, h:mm a' }}</span>
                </div>
              </div>
            }
            @if (detail()!.recentMovements.length === 0) {
              <div class="no-recent">No recent movements</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      color: white;
    }

    .page-header {
      margin-bottom: 20px;
      .page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .page-sub { font-size: 14px; color: #64748b; margin: 0; }
    }

    .period-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 20px;
      background: rgba(255,255,255,0.04);
      border-radius: 12px;
      padding: 4px;
    }

    .period-btn {
      flex: 1;
      padding: 9px 6px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &.active { background: rgba(8,145,178,0.2); color: #06b6d4; }
      &.sm { padding: 6px 10px; font-size: 12px; flex: none; }
    }

    .loading-state { text-align: center; padding: 60px; }
    .spinner-big { width: 40px; height: 40px; border: 3px solid rgba(8,145,178,0.2); border-top-color: #0891b2; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Leaderboard */
    .leaderboard {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 20px;

      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }

    .leader-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;

      &:hover { transform: translateY(-2px); border-color: rgba(8,145,178,0.3); }
      &.gold { border-color: rgba(234,179,8,0.3); background: rgba(234,179,8,0.04); }
      &.silver { border-color: rgba(148,163,184,0.3); background: rgba(148,163,184,0.04); }
      &.bronze { border-color: rgba(194,120,79,0.3); background: rgba(194,120,79,0.04); }
    }

    .leader-rank { font-size: 24px; }
    .leader-avatar {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: linear-gradient(135deg, #0891b2, #0e7490);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
    }

    .leader-name { font-size: 14px; font-weight: 700; color: white; }
    .leader-actions { font-size: 12px; color: #64748b; }
    .leader-qty {
      display: flex;
      gap: 4px;
      align-items: center;
      font-size: 13px;
      font-weight: 700;

      .in { color: #4ade80; }
      .sep { color: #475569; }
      .out { color: #f87171; }
    }

    /* Staff list */
    .staff-list { display: flex; flex-direction: column; gap: 8px; }

    .staff-row {
      display: grid;
      grid-template-columns: 1fr auto auto 20px;
      align-items: center;
      gap: 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;

      &:hover { background: rgba(255,255,255,0.06); border-color: rgba(8,145,178,0.25); }

      @media (max-width: 520px) { grid-template-columns: 1fr auto 20px; }
    }

    .activity-bar-wrap {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(255,255,255,0.04);
    }

    .activity-bar {
      height: 100%;
      background: linear-gradient(90deg, #0891b2, #06b6d4);
      border-radius: 0 2px 2px 0;
      transition: width 0.6s ease;
    }

    .staff-left { display: flex; align-items: center; gap: 12px; min-width: 0; }

    .staff-avatar {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(8,145,178,0.15);
      border: 1px solid rgba(8,145,178,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      color: #06b6d4;
      flex-shrink: 0;

      &.manager { background: rgba(168,85,247,0.15); border-color: rgba(168,85,247,0.2); color: #c084fc; }
    }

    .staff-name { font-size: 15px; font-weight: 700; color: white; margin-bottom: 4px; }
    .staff-meta { display: flex; gap: 6px; align-items: center; }
    .staff-code { font-size: 12px; color: #64748b; font-family: monospace; }
    .staff-role {
      padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;
      background: rgba(8,145,178,0.12); color: #06b6d4;
      &.manager { background: rgba(168,85,247,0.12); color: #c084fc; }
    }

    .staff-stats {
      display: flex;
      gap: 8px;

      @media (max-width: 520px) { display: none; }
    }

    .stat-chip {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6px 10px;
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      min-width: 50px;

      .stat-num { font-size: 15px; font-weight: 800; color: white; line-height: 1; }
      .stat-lbl { font-size: 10px; color: #64748b; margin-top: 2px; }

      &.in-chip .stat-num { color: #4ade80; }
      &.out-chip .stat-num { color: #f87171; }
    }

    .chevron { color: #475569; font-size: 20px; }

    .empty-state {
      text-align: center; padding: 60px 20px;
      .empty-icon { font-size: 48px; margin-bottom: 16px; }
      h3 { color: white; font-size: 18px; margin: 0 0 8px; }
      p { color: #64748b; font-size: 14px; margin: 0; }
    }

    /* Drawer */
    .drawer-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 300;
      animation: fadeIn 0.2s ease;
      display: flex; align-items: flex-end;

      @media (min-width: 640px) { align-items: center; justify-content: flex-end; }
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .drawer {
      background: #0f1f35;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px 24px 0 0;
      padding: 20px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      animation: slideUp 0.25s ease;

      @media (min-width: 640px) {
        border-radius: 24px;
        width: 420px;
        max-height: 90vh;
        margin-right: 20px;
        margin-bottom: 20px;
        animation: slideIn 0.25s ease;
      }
    }

    @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes slideIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    .drawer-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .detail-avatar {
      width: 52px; height: 52px; border-radius: 16px;
      background: linear-gradient(135deg, #0891b2, #0e7490);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 800; flex-shrink: 0;
      &.manager { background: linear-gradient(135deg, #7c3aed, #6d28d9); }
    }

    .detail-name { font-size: 17px; font-weight: 800; color: white; margin-bottom: 4px; }
    .detail-meta { display: flex; gap: 8px; align-items: center; }

    .close-btn {
      margin-left: auto; width: 32px; height: 32px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1); background: transparent;
      color: #64748b; cursor: pointer; flex-shrink: 0;
      &:hover { color: white; }
    }

    .breakdown-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }

    .breakdown-card {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 12px;
    }

    .bc-icon { font-size: 20px; flex-shrink: 0; }
    .bc-label { font-size: 12px; color: #94a3b8; margin-bottom: 2px; }
    .bc-stats { display: flex; gap: 8px; align-items: center; }
    .bc-count { font-size: 13px; font-weight: 700; color: white; }
    .bc-qty { font-size: 13px; font-weight: 700; }

    .no-breakdown { grid-column: span 2; text-align: center; color: #475569; font-size: 14px; padding: 16px; }

    .detail-period-row { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }

    .recent-header { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }

    .recent-list { display: flex; flex-direction: column; gap: 6px; }

    .recent-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
    }

    .r-icon { font-size: 18px; flex-shrink: 0; }
    .r-info { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .r-med { font-size: 13px; font-weight: 600; color: white; }
    .r-potency { padding: 1px 7px; border-radius: 5px; background: rgba(8,145,178,0.15); color: #06b6d4; font-size: 11px; font-weight: 600; }
    .r-note { font-size: 11px; color: #64748b; font-style: italic; }
    .r-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
    .r-qty { font-size: 14px; font-weight: 800; }
    .r-time { font-size: 10px; color: #475569; white-space: nowrap; }

    .no-recent { text-align: center; color: #475569; font-size: 14px; padding: 20px; }
  `]
})
export class StaffActivityComponent implements OnInit {
  private api = inject(StoreApiService);

  period = signal('today');
  loading = signal(true);
  staffList = signal<StaffActivity[]>([]);

  detailOpen = signal(false);
  detail = signal<StaffDetailResponse | null>(null);
  detailPeriod = signal('week');
  private selectedStaffId = '';

  periods = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'All Time', value: 'all' }
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getStaffActivity(this.period()).subscribe({
      next: (res) => { this.staffList.set(res.staff); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  setPeriod(p: string): void { this.period.set(p); this.load(); }

  topThree(): StaffActivity[] {
    return this.staffList().filter(s => s.totalActions > 0).slice(0, 3);
  }

  maxActions(): number {
    return Math.max(...this.staffList().map(s => s.totalActions), 1);
  }

  openDetail(s: StaffActivity): void {
    this.selectedStaffId = s.staffId;
    this.detailPeriod.set('week');
    this.loadDetail();
    this.detailOpen.set(true);
  }

  closeDetail(): void { this.detailOpen.set(false); }

  setDetailPeriod(p: string): void {
    this.detailPeriod.set(p);
    this.loadDetail();
  }

  private loadDetail(): void {
    this.api.getStaffDetail(this.selectedStaffId, this.detailPeriod()).subscribe({
      next: (res) => this.detail.set(res)
    });
  }

  typeIcon(type: string): string { return TYPE_ICONS[type] ?? '📝'; }
  typeLabel(type: string): string { return TYPE_LABELS[type] ?? type; }
  typeColor(type: string): string { return TYPE_COLORS[type] ?? '#94a3b8'; }
  isOut(type: string): boolean { return ['SALE_OUT', 'ADJUSTMENT_OUT', 'TRANSFER_OUT', 'EXPIRED_REMOVAL'].includes(type); }
}
