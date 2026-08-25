import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import {
  CLINIC_API_BASE_URL,
  CLINIC_AUTH_TOKEN_KEY,
  requestTimeoutInterceptor,
} from '@hopehub/clinic-api';

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
    provideClientHydration(
      withEventReplay(),
      // Until all environments have the public-content-audience migration,
      // never embed raw blog API responses from another HopeHub domain in HTML.
      withHttpTransferCacheOptions({ filter: (request) => !request.url.includes('/blog') }),
    ),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, requestTimeoutInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
