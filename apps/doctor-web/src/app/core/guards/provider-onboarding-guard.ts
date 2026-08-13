import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ROUTE_PATHS } from '../constants/app-routes.constants';
import {
  buildProviderOnboardingStatus,
  needsProviderPathSelection,
} from '../constants/provider-onboarding.constants';
import { DoctorSessionService } from '../services/doctor-session';

export const providerOnboardingGuard: CanActivateFn = async () => {
  const session = inject(DoctorSessionService);
  const router = inject(Router);

  let loaded: Awaited<ReturnType<DoctorSessionService['load']>>;
  try {
    loaded = await session.load();
  } catch {
    return router.createUrlTree(['/', ROUTE_PATHS.LOGIN]);
  }

  if (needsProviderPathSelection(loaded.doctorProfile)) {
    return router.createUrlTree(['/', ROUTE_PATHS.WELCOME]);
  }
  try {
    const status = buildProviderOnboardingStatus(
      loaded.doctorProfile,
      loaded.profileImageUrl ?? null,
      await session.readiness(),
    );
    if (status.complete) return true;
  } catch {
    // Keep authenticated providers in the guided area when readiness cannot be verified.
  }

  return router.createUrlTree(['/', ROUTE_PATHS.DASHBOARD], {
    queryParams: { onboarding: 'required' },
  });
};
