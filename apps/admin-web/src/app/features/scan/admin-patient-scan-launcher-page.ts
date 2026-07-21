import { Component } from '@angular/core';
import { PatientScanLauncherComponent } from '@hopehub/platform-ui';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';

@Component({
  selector: 'app-admin-patient-scan-launcher-page',
  imports: [PatientScanLauncherComponent],
  template: `
    <hopehub-patient-scan-launcher
      [apiBase]="apiBase"
      [tokenKey]="tokenKey"
      app="admin"
    />
  `
})
export class AdminPatientScanLauncherPage {
  readonly apiBase = environment.apiUrl;
  readonly tokenKey = AUTH_TOKEN_KEY;
}
