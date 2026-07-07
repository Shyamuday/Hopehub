import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API_PATHS } from '../core/constants/api-paths.constants';
import { AuthService } from '../auth/auth.service';
import { ROUTE_PATHS } from '../core/constants/app-routes.constants';
import { environment } from '../../environments/environment';
import { PATIENT_ACCOUNT_NAV } from './constants/patient-account.constants';

@Component({
  selector: 'app-patient-account-hub',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './patient-account-hub.component.html',
  styleUrl: './patient-account-hub.component.scss'
})
export class PatientAccountHubComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly profile = signal<{
    name: string;
    mobile?: string | null;
    email?: string | null;
    patientCode?: string | null;
  } | null>(null);

  readonly quickLinks = PATIENT_ACCOUNT_NAV.filter((item) =>
    ['profile', 'addresses', 'dashboard', 'refer', 'rewards'].includes(item.id)
  );

  readonly dashboardLink = `/${ROUTE_PATHS.PATIENT_DASHBOARD}`;

  ngOnInit() {
    void this.load();
  }

  private async load() {
    const token = this.auth.token;
    try {
      if (token) {
        const res = await fetch(`${environment.apiUrl}${API_PATHS.PATIENT.PROFILE}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          this.profile.set(data.profile);
          return;
        }
      }
      const user = this.auth.user();
      if (user) this.profile.set({ name: user.name, mobile: user.mobile, email: user.email });
    } catch {
      const user = this.auth.user();
      if (user) this.profile.set({ name: user.name, mobile: user.mobile, email: user.email });
    } finally {
      this.loading.set(false);
    }
  }
}
