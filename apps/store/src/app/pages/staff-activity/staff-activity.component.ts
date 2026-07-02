import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';
import { StaffActivity, StaffDetailResponse } from '../../models';
import { ACTIVITY_PERIODS } from '../../core/constants/pagination.constants';
import { STORE_STAFF_ROLES } from '../../core/constants/auth.constants';
import { STAFF_ACTIVITY_DISPLAY, OUTBOUND_MOVEMENT_TYPES } from '../../shared/constants/stock-movement.constants';

type ActivityDisplayKey = keyof typeof STAFF_ACTIVITY_DISPLAY.ICONS;

function activityDisplayKey(type: string): ActivityDisplayKey | null {
  if (type === 'EXPIRED_REMOVAL') return 'EXPIRED_OUT';
  return type in STAFF_ACTIVITY_DISPLAY.ICONS ? type as ActivityDisplayKey : null;
}

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
                <div class="staff-avatar" [class.manager]="s.role === managerRole">
                  {{ s.name.charAt(0).toUpperCase() }}
                </div>
                <div class="staff-info">
                  <div class="staff-name">{{ s.name }}</div>
                  <div class="staff-meta">
                    <span class="staff-code">{{ s.staffCode }}</span>
                    <span class="staff-role" [class.manager]="s.role === managerRole">{{ s.role }}</span>
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
            <div class="detail-avatar" [class.manager]="detail()!.staff.role === managerRole">
              {{ detail()!.staff.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="detail-name">{{ detail()!.staff.name }}</div>
              <div class="detail-meta">
                <span class="staff-code">{{ detail()!.staff.staffCode }}</span>
                <span class="staff-role" [class.manager]="detail()!.staff.role === managerRole">{{ detail()!.staff.role }}</span>
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
  styleUrl: './staff-activity.component.scss'
})
export class StaffActivityComponent implements OnInit {
  private api = inject(StoreApiService);

  readonly managerRole = STORE_STAFF_ROLES.MANAGER;

  period = signal(ACTIVITY_PERIODS.TODAY);
  loading = signal(true);
  staffList = signal<StaffActivity[]>([]);

  detailOpen = signal(false);
  detail = signal<StaffDetailResponse | null>(null);
  detailPeriod = signal(ACTIVITY_PERIODS.WEEK);
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
    this.detailPeriod.set(ACTIVITY_PERIODS.WEEK);
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

  typeIcon(type: string): string {
    const key = activityDisplayKey(type);
    return key ? STAFF_ACTIVITY_DISPLAY.ICONS[key] : STAFF_ACTIVITY_DISPLAY.FALLBACK.ICON;
  }

  typeLabel(type: string): string {
    const key = activityDisplayKey(type);
    return key ? STAFF_ACTIVITY_DISPLAY.LABELS[key] : type;
  }

  typeColor(type: string): string {
    const key = activityDisplayKey(type);
    return key ? STAFF_ACTIVITY_DISPLAY.COLORS[key] : STAFF_ACTIVITY_DISPLAY.FALLBACK.COLOR;
  }

  isOut(type: string): boolean { return OUTBOUND_MOVEMENT_TYPES.has(type); }
}
