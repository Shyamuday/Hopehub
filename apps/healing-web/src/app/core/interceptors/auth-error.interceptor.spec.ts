import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authErrorInterceptor } from './auth-error.interceptor';

describe('authErrorInterceptor', () => {
  const auth = {
    getRefreshToken: vi.fn<() => string | null>(),
    refreshAccessToken: vi.fn<() => Promise<string | null>>(),
    requireLogin: vi.fn<(returnUrl?: string) => void>(),
  };
  const router = { url: '/hope-hub/live-groups/support' };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('refreshes once and retries the protected request with the new token', async () => {
    auth.getRefreshToken.mockReturnValue('refresh-token');
    auth.refreshAccessToken.mockResolvedValue('new-access-token');
    const unauthorized = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    const next = vi
      .fn<HttpHandlerFn>()
      .mockReturnValueOnce(throwError(() => unauthorized))
      .mockReturnValueOnce(of(new HttpResponse({ status: 200 })));
    const request = new HttpRequest(
      'POST',
      `${environment.apiUrl}/hope-hub/live-groups/1/messages`,
      null,
      {
        headers: new HttpHeaders({ Authorization: 'Bearer expired-access-token' }),
      },
    );

    await firstValueFrom(TestBed.runInInjectionContext(() => authErrorInterceptor(request, next)));

    expect(auth.refreshAccessToken).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledTimes(2);
    expect(next.mock.calls[1][0].headers.get('Authorization')).toBe('Bearer new-access-token');
    expect(auth.requireLogin).not.toHaveBeenCalled();
  });

  it('clears the invalid session and opens login for the current page when refresh is unavailable', async () => {
    auth.getRefreshToken.mockReturnValue(null);
    const unauthorized = new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
      error: { message: 'Invalid or expired token' },
    });
    const next = vi.fn<HttpHandlerFn>().mockReturnValue(throwError(() => unauthorized));
    const request = new HttpRequest(
      'POST',
      `${environment.apiUrl}/hope-hub/live-groups/1/messages`,
      null,
      {
        headers: new HttpHeaders({ Authorization: 'Bearer expired-access-token' }),
      },
    );

    const result = firstValueFrom(
      TestBed.runInInjectionContext(() => authErrorInterceptor(request, next)),
    );

    await expect(result).rejects.toMatchObject({
      status: 401,
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Your session expired. Please sign in again.',
      },
    });
    expect(auth.requireLogin).toHaveBeenCalledWith('/hope-hub/live-groups/support');
  });
});
