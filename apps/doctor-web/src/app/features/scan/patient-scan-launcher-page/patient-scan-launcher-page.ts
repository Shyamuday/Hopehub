import { Component } from '@angular/core';
import { PatientScanLauncherComponent } from '@vitalis/platform-ui';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';

@Component({
  selector: 'app-doctor-patient-scan-launcher-page',
  imports: [PatientScanLauncherComponent],
  template: `
    <vitalis-patient-scan-launcher
      [apiBase]="apiBase"
      [tokenKey]="tokenKey"
      app="doctor"
    />
  `
})
export class DoctorPatientScanLauncherPage {
  readonly apiBase = environment.apiUrl;
  readonly tokenKey = AUTH_TOKEN_KEY;
}
