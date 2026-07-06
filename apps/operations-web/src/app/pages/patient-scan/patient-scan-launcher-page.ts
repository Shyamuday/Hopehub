import { Component, computed, inject } from '@angular/core';
import { PatientScanLauncherComponent } from '@vitalis/platform-ui';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { PlatformAuthService } from '../../services/platform-auth.service';

@Component({
  selector: 'app-patient-scan-launcher-page',
  standalone: true,
  imports: [PatientScanLauncherComponent],
  template: `
    <vitalis-patient-scan-launcher
      [apiBase]="apiBase"
      [tokenKey]="tokenKey"
      app="operations"
      adminBasePath="admin"
      [storeSession]="storeSession()"
    />
  `
})
export class PatientScanLauncherPage {
  private readonly auth = inject(PlatformAuthService);

  readonly apiBase = environment.apiUrl;
  readonly tokenKey = AUTH_TOKEN_KEY;
  readonly storeSession = computed(() => this.auth.storeStaff());
}
