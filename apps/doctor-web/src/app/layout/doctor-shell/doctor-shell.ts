import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RoleTaskGuideComponent, NotificationBellHostComponent } from '@vitalis/platform-ui';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { Auth } from '../../core/services/auth';
import { DoctorRealtimeService } from '../../core/services/doctor-realtime.service';
import { DoctorSessionService } from '../../core/services/doctor-session';

export type DoctorNavItem = {
  path: string;
  label: string;
  icon: string;
  shortLabel: string;
};

const NAV_ICONS: Record<string, { icon: string; shortLabel: string }> = {
  Worklist: { icon: '📋', shortLabel: 'Work' },
  Dashboard: { icon: '📊', shortLabel: 'Home' },
  Appointments: { icon: '🩺', shortLabel: 'Appts' },
  Repertory: { icon: '📖', shortLabel: 'Rep' },
  Patients: { icon: '👥', shortLabel: 'Patients' },
  Slots: { icon: '📅', shortLabel: 'Slots' },
  Earnings: { icon: '💰', shortLabel: 'Pay' },
  Leaves: { icon: '🌴', shortLabel: 'Leave' },
  Profile: { icon: '👤', shortLabel: 'Profile' },
};

@Component({
  selector: 'app-doctor-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, RoleTaskGuideComponent, NotificationBellHostComponent],
  templateUrl: './doctor-shell.html',
  styleUrl: './doctor-shell.scss',
})
export class DoctorShell implements OnInit, OnDestroy {
  navItems: DoctorNavItem[] = [];
  doctorName = '';
  doctorTypeLabel = '';
  specialtyLabel = '';
  doctorTypeKey: string | null = null;
  loadingSession = true;
  menuOpen = signal(false);
  assignmentNotice = signal('');

  private readonly realtime = inject(DoctorRealtimeService);
  private readonly router = inject(Router);

  readonly bellConfig = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications'
  };

  constructor(
    private readonly auth: Auth,
    private readonly session: DoctorSessionService
  ) {}

  async ngOnInit() {
    try {
      const profile = await this.session.load();
      this.doctorName = profile.name;
      this.doctorTypeLabel = profile.doctorProfile?.doctorTypeLabel || 'Doctor';
      this.specialtyLabel = profile.doctorProfile?.specialty || '';
      this.doctorTypeKey = profile.doctorProfile?.doctorType ?? null;
      this.navItems = this.decorateNav(this.session.navItems());
    } catch {
      this.navItems = this.decorateNav(this.session.navItems());
    } finally {
      this.loadingSession = false;
    }

    this.realtime.connect((payload) => {
      const label = payload.patientCode
        ? `${payload.patientName ?? 'Patient'} (${payload.patientCode})`
        : payload.patientName ?? 'New patient';
      this.assignmentNotice.set(`New case: ${label}`);
      void this.router.navigate(['/', ROUTE_PATHS.CASE_ANALYSIS, payload.consultationId, 'case-analysis']);
      window.setTimeout(() => this.assignmentNotice.set(''), 5000);
    });
  }

  ngOnDestroy(): void {
    this.realtime.disconnect();
  }

  logout() {
    this.session.clear();
    this.auth.logout();
  }

  openMenu() {
    this.menuOpen.set(true);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  private decorateNav(items: Array<{ path: string; label: string }>): DoctorNavItem[] {
    return items.map((item) => {
      const meta = NAV_ICONS[item.label] || { icon: '•', shortLabel: item.label.slice(0, 6) };
      return { ...item, icon: meta.icon, shortLabel: meta.shortLabel };
    });
  }
}
