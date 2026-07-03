import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { DoctorSessionService } from '../../core/services/doctor-session';

@Component({
  selector: 'app-doctor-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './doctor-shell.html',
  styleUrl: './doctor-shell.scss',
})
export class DoctorShell implements OnInit {
  navItems: Array<{ path: string; label: string }> = [];
  doctorName = '';
  doctorTypeLabel = '';
  specialtyLabel = '';
  loadingSession = true;

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
      this.navItems = this.session.navItems();
    } catch {
      this.navItems = this.session.navItems();
    } finally {
      this.loadingSession = false;
    }
  }

  logout() {
    this.session.clear();
    this.auth.logout();
  }
}
