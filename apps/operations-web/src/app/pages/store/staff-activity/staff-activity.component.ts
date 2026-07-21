import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StoreApiService } from '../../../services/store-api.service';
import { StaffActivity, StaffDetailResponse } from '../../../models/store';
import { ACTIVITY_PERIODS } from '../../../core/constants/store/pagination.constants';
import { STORE_STAFF_ROLES } from '../../../core/constants/store/auth.constants';
import { STAFF_ACTIVITY_DISPLAY, OUTBOUND_MOVEMENT_TYPES } from '@hopehub/store-ui';

type ActivityDisplayKey = keyof typeof STAFF_ACTIVITY_DISPLAY.ICONS;

function activityDisplayKey(type: string): ActivityDisplayKey | null {
  if (type === 'EXPIRED_REMOVAL') return 'EXPIRED_OUT';
  return type in STAFF_ACTIVITY_DISPLAY.ICONS ? type as ActivityDisplayKey : null;
}

@Component({
  selector: 'app-staff-activity',
  imports: [DatePipe],
  templateUrl: './staff-activity.component.html',
  styleUrl: './staff-activity.component.scss'
})
export class StaffActivityComponent implements OnInit {
  private api = inject(StoreApiService);

  readonly managerRole = STORE_STAFF_ROLES.MANAGER;

  period = signal<string>(ACTIVITY_PERIODS.TODAY);
  loading = signal(true);
  staffList = signal<StaffActivity[]>([]);

  detailOpen = signal(false);
  detail = signal<StaffDetailResponse | null>(null);
  detailPeriod = signal<string>(ACTIVITY_PERIODS.WEEK);
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
    this.api.getStaffActivity(this.period() as typeof ACTIVITY_PERIODS.TODAY).subscribe({
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
    this.api.getStaffDetail(this.selectedStaffId, this.detailPeriod() as typeof ACTIVITY_PERIODS.WEEK).subscribe({
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
