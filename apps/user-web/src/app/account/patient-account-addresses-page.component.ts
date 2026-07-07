import { Component, OnInit, inject, signal } from '@angular/core';
import { API_PATHS } from '../core/constants/api-paths.constants';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';
import { PatientAddressBookComponent } from '../shared/patient-address-book/patient-address-book.component';

@Component({
  selector: 'app-patient-account-addresses-page',
  standalone: true,
  imports: [PatientAddressBookComponent],
  templateUrl: './patient-account-addresses-page.component.html',
  styleUrl: './patient-account-addresses-page.component.scss'
})
export class PatientAccountAddressesPageComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly recipientName = signal('');
  readonly recipientPhone = signal('');
  readonly loading = signal(true);

  ngOnInit() {
    void this.loadProfile();
  }

  private async loadProfile() {
    const token = this.auth.token;
    try {
      if (!token) return;
      const res = await fetch(`${environment.apiUrl}${API_PATHS.PATIENT.PROFILE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const { profile } = await res.json();
      this.recipientName.set(profile?.name || '');
      this.recipientPhone.set(profile?.alternateMobile || profile?.mobile || '');
    } finally {
      this.loading.set(false);
    }
  }
}
