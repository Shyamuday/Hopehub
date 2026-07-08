import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideRouter, withExperimentalAutoCleanupInjectors } from '@angular/router';
import { DEV_DEMO_PORT } from '@vitalis/platform-ui';
import { CLINIC_API_BASE_URL, CLINIC_AUTH_TOKEN_KEY } from '@vitalis/clinic-api';

import { routes } from './app.routes';
import { AUTH_TOKEN_KEY } from './core/constants/auth.constants';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';
import { DevDemoService } from './core/services/dev-demo.service';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: CLINIC_API_BASE_URL, useValue: environment.apiUrl },
    { provide: CLINIC_AUTH_TOKEN_KEY, useValue: AUTH_TOKEN_KEY },
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withXhr(), withInterceptors([authTokenInterceptor, authErrorInterceptor])),
    provideRouter(routes, withExperimentalAutoCleanupInjectors()),
    { provide: DEV_DEMO_PORT, useExisting: DevDemoService },
  ],
};
