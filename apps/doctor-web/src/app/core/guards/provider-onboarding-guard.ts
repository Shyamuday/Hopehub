import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ROUTE_PATHS } from '../constants/app-routes.constants';
import { buildProviderOnboardingStatus } from '../constants/provider-onboarding.constants';
import { DoctorSessionService } from '../services/doctor-session';

export const providerOnboardingGuard: CanActivateFn = async () => {
  const session = inject(DoctorSessionService);
  const router = inject(Router);

  try {
    const loaded = await session.load();
    const status = buildProviderOnboardingStatus(
      loaded.doctorProfile,
      loaded.profileImageUrl ?? null,
    );
    if (status.complete) return true;
  } catch {
    return router.createUrlTree(['/', ROUTE_PATHS.LOGIN]);
  }

  return router.createUrlTree(['/', ROUTE_PATHS.DASHBOARD], {
    queryParams: { onboarding: 'required' },
  });
};
