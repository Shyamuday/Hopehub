import { Component } from '@angular/core';
import { PatientScanLauncherComponent } from '@vitalis/platform-ui';
import { environment } from '../environments/environment';
import { AUTH_TOKEN_KEY } from './core/constants/auth.constants';

@Component({
  selector: 'app-user-patient-scan-page',
  imports: [PatientScanLauncherComponent],
  template: `
    <vitalis-patient-scan-launcher
      [apiBase]="apiBase"
      [tokenKey]="tokenKey"
      app="user"
    />
  `
})
export class UserPatientScanPage {
  readonly apiBase = environment.apiUrl;
  readonly tokenKey = AUTH_TOKEN_KEY;
}
