import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import {
  provideRouter,
  withExperimentalAutoCleanupInjectors,
  withExperimentalPlatformNavigation
} from '@angular/router';
import { DEV_DEMO_PORT } from '@vitalis/platform-ui';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { DevDemoService } from './core/services/dev-demo.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withExperimentalPlatformNavigation(),
      withExperimentalAutoCleanupInjectors()
    ),
    provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
    { provide: DEV_DEMO_PORT, useExisting: DevDemoService }
  ]
};
