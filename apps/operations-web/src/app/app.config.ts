import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import {
  provideRouter,
  withExperimentalAutoCleanupInjectors,
  withExperimentalPlatformNavigation
} from '@angular/router';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DEV_DEMO_PORT } from '@vitalis/platform-ui';
import { CLINIC_API_BASE_URL, CLINIC_AUTH_TOKEN_KEY } from '@vitalis/clinic-api';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AUTH_TOKEN_KEY } from './core/constants/auth.constants';
import { AdminAuth } from '@vitalis/admin-console/core/services/admin-auth';
import { AdminAuthBridge } from './admin/admin-auth.bridge';
import { DevDemoService } from './services/dev-demo.service';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: CLINIC_API_BASE_URL, useValue: environment.apiUrl },
    { provide: CLINIC_AUTH_TOKEN_KEY, useValue: AUTH_TOKEN_KEY },
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withExperimentalPlatformNavigation(),
      withExperimentalAutoCleanupInjectors()
    ),
    provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
    provideAnimations(),
    { provide: AdminAuth, useExisting: AdminAuthBridge },
    { provide: DEV_DEMO_PORT, useExisting: DevDemoService }
  ]
};
