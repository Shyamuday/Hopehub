import { Component, inject } from '@angular/core';
import { PatientScanLauncherComponent } from '@hopehub/platform-ui';
import { environment } from '../../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../../core/constants/auth.constants';
import { NativePermissionsService } from '../../../core/services/native-permissions.service';

@Component({
  selector: 'app-doctor-patient-scan-launcher-page',
  imports: [PatientScanLauncherComponent],
  template: `
    <hopehub-patient-scan-launcher
      [apiBase]="apiBase"
      [tokenKey]="tokenKey"
      [beforeCamera]="requestCameraAccess"
      app="doctor"
    />
  `
})
export class DoctorPatientScanLauncherPage {
  private readonly permissions = inject(NativePermissionsService);
  readonly apiBase = environment.apiUrl;
  readonly tokenKey = AUTH_TOKEN_KEY;

  readonly requestCameraAccess = async () => {
    const result = await this.permissions.ensureScanPermissions();
    return result.granted;
  };
}
