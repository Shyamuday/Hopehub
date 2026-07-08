import { Component, OnInit, inject, signal } from '@angular/core';
import { ClinicHttpClient } from '@vitalis/clinic-api';
import { API_PATHS } from '../core/constants/api-paths.constants';
import { AuthService } from '../auth/auth.service';
import { PatientAddressBookComponent } from '../shared/patient-address-book/patient-address-book.component';

@Component({
  selector: 'app-patient-account-addresses-page',
  standalone: true,
  imports: [PatientAddressBookComponent],
  templateUrl: './patient-account-addresses-page.component.html',
  styleUrl: './patient-account-addresses-page.component.scss',
})
export class PatientAccountAddressesPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly http = inject(ClinicHttpClient);

  readonly recipientName = signal('');
  readonly recipientPhone = signal('');
  readonly loading = signal(true);

  ngOnInit() {
    void this.loadProfile();
  }

  private async loadProfile() {
    try {
      if (!this.auth.token) return;
      const { profile } = await this.http.get<{
        profile?: { name?: string; alternateMobile?: string; mobile?: string };
      }>(API_PATHS.PATIENT.PROFILE);
      this.recipientName.set(profile?.name || '');
      this.recipientPhone.set(profile?.alternateMobile || profile?.mobile || '');
    } catch {
      // no-op
    } finally {
      this.loading.set(false);
    }
  }
}
