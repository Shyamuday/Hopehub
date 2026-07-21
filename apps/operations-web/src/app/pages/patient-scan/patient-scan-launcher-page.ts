import { Component, computed, inject } from '@angular/core';
import { PatientScanLauncherComponent } from '@hopehub/platform-ui';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { NativePermissionsService } from '../../core/services/native-permissions.service';
import { PlatformAuthService } from '../../services/platform-auth.service';

@Component({
  selector: 'app-patient-scan-launcher-page',
  standalone: true,
  imports: [PatientScanLauncherComponent],
  template: `
    <hopehub-patient-scan-launcher
      [apiBase]="apiBase"
      [tokenKey]="tokenKey"
      [beforeCamera]="requestCameraAccess"
      app="operations"
      adminBasePath="admin"
      [storeSession]="storeSession()"
    />
  `
})
export class PatientScanLauncherPage {
  private readonly auth = inject(PlatformAuthService);
  private readonly permissions = inject(NativePermissionsService);

  readonly apiBase = environment.apiUrl;
  readonly tokenKey = AUTH_TOKEN_KEY;
  readonly storeSession = computed(() => this.auth.storeStaff());

  readonly requestCameraAccess = async () => {
    const result = await this.permissions.ensureScanPermissions();
    return result.granted;
  };
}
