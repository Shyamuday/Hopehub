import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import {
  provideRouter,
  withExperimentalAutoCleanupInjectors,
  withExperimentalPlatformNavigation,
} from '@angular/router';
import { CLINIC_API_BASE_URL, CLINIC_AUTH_TOKEN_KEY } from '@hopehub/clinic-api';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AUTH_TOKEN_KEY } from './core/constants/auth.constants';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: CLINIC_API_BASE_URL, useValue: environment.apiUrl },
    { provide: CLINIC_AUTH_TOKEN_KEY, useValue: AUTH_TOKEN_KEY },
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withExperimentalPlatformNavigation(),
      withExperimentalAutoCleanupInjectors(),
    ),
    provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
  ],
};
