import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ROUTE_PATHS } from '../constants/app-routes.constants';
import type { DoctorCapabilities } from '../constants/doctor-types.constants';
import { DoctorSessionService } from '../services/doctor-session';

export const providerCapabilityGuard: CanActivateFn = async (route) => {
  const session = inject(DoctorSessionService);
  const router = inject(Router);
  const capability = route.data?.['capability'] as keyof DoctorCapabilities | undefined;

  if (!capability) return true;

  try {
    await session.load();
    if (session.capabilities()[capability]) return true;
  } catch {
    return router.createUrlTree(['/', ROUTE_PATHS.LOGIN]);
  }

  return router.createUrlTree(['/', ROUTE_PATHS.DASHBOARD]);
};
