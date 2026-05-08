import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { AuthService } from '../auth/auth.service';
import { SELF_DIAGNOSIS_TOOLS } from './self-diagnosis.constants';

@Component({
  selector: 'app-self-diagnosis-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, AppHeaderComponent, AppFooterComponent],
  templateUrl: './self-diagnosis-hub.component.html',
  styleUrl: './self-diagnosis-hub.component.scss'
})
export class SelfDiagnosisHubComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly pageTitle = 'Self-assessment worksheets';
  readonly tools = SELF_DIAGNOSIS_TOOLS;
  readonly whatsappLink =
    'https://wa.me/919876543210?text=Hi%20Vitalis%20Care%20and%20Research%20Centre%2C%20I%20need%20help%20with%20my%20consultation';

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
