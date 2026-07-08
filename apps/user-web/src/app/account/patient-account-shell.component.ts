import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { AuthService } from '../auth/auth.service';
import { WhatsappLinkService } from '../core/services/whatsapp-link.service';
import { PATIENT_ACCOUNT_NAV } from './constants/patient-account.constants';

@Component({
  selector: 'app-patient-account-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppHeaderComponent, AppFooterComponent],
  templateUrl: './patient-account-shell.component.html',
  styleUrl: './patient-account-shell.component.scss'
})
export class PatientAccountShellComponent {
  readonly auth = inject(AuthService);
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
  readonly navItems = PATIENT_ACCOUNT_NAV.filter((item) =>
    ['overview', 'profile', 'addresses', 'consultations', 'orders', 'card', 'permissions', 'refer', 'rewards', 'dashboard'].includes(item.id)
  );

  logout() {
    this.auth.logout();
    window.location.href = '/';
  }
}
