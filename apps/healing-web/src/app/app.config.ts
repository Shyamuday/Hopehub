import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  ErrorHandler,
  isDevMode,
} from '@angular/core';
import {
  provideRouter,
  withRouterConfig,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/services/global-error-handler.service';
import { provideServiceWorker } from '@angular/service-worker';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { requestTimeoutInterceptor } from '@hopehub/clinic-api';
import { PublicCommunicationConfigService } from './core/services/public-communication-config.service';

function isLazyChunkError(error: unknown): boolean {
  const errorLike = error as { name?: string; message?: string; reason?: unknown };
  const message = String(errorLike?.message || errorLike?.reason || error || '');

  return (
    errorLike?.name === 'ChunkLoadError' ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Loading chunk')
  );
}

function handleNavigationError(error: unknown): void {
  console.error('Navigation error:', error);

  if (!isLazyChunkError(error) || typeof window === 'undefined') {
    return;
  }

  const reloadKey = 'hopehub:last-navigation-reload';
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  const lastReloadUrl = window.sessionStorage.getItem(reloadKey);

  if (lastReloadUrl === currentUrl) {
    window.sessionStorage.removeItem(reloadKey);
    return;
  }

  window.sessionStorage.setItem(reloadKey, currentUrl);
  window.location.reload();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, requestTimeoutInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [PublicCommunicationConfigService],
      useFactory: (config: PublicCommunicationConfigService) => () => config.load(),
    },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },

    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload',
        paramsInheritanceStrategy: 'emptyOnly',
        urlUpdateStrategy: 'eager',
      }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
      withNavigationErrorHandler(handleNavigationError),
    ),

    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
