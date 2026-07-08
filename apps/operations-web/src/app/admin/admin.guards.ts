import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlatformAuthService } from '../services/platform-auth.service';

export const ADMIN_ROUTE_CAPABILITIES: Record<string, string> = {
  dashboard: 'admin.dashboard',
  doctors: 'admin.doctors',
  consumers: 'admin.consumers',
  diseases: 'admin.catalog',
  hr: 'admin.doctors',
  'hr-users': 'admin.users',
  employees: 'admin.consumers',
  leaves: 'admin.consumers',
  stores: 'admin.inventory',
  'purchase-orders': 'admin.purchase_orders',
  suppliers: 'admin.catalog',
  medicines: 'admin.catalog',
  inventory: 'admin.inventory',
  notifications: 'admin.notifications',
  'admin-users': 'admin.users',
  'ecosystem-users': 'admin.ecosystem_users',
  consultations: 'admin.consultations',
  'online-doctors': 'admin.doctors',
  scan: 'admin.consumers',
  payments: 'admin.finance',
  audit: 'admin.audit',
  security: 'admin.audit',
  adherence: 'admin.dashboard',
  analytics: 'admin.dashboard',
  finance: 'admin.finance',
  staff: 'admin.users',
  payroll: 'admin.finance',
  rates: 'admin.finance',
  rewards: 'admin.consumers',
  'clinical-records': 'admin.consumers',
  vacancies: 'admin.dashboard',
  testimonials: 'admin.dashboard',
  faq: 'admin.dashboard',
  blog: 'admin.dashboard',
  'site-config': 'admin.dashboard',
  'chat-inbox': 'admin.dashboard'
};

export const adminSectionGuard: CanActivateFn = () => {
  const auth = inject(PlatformAuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  const caps = auth.capabilities();
  if (caps.some((cap) => cap.startsWith('admin.'))) {
    return true;
  }
  if (user?.role === 'HR' && caps.includes('hr.portal')) {
    return true;
  }
  return router.createUrlTree([`/${auth.defaultRoute()}`]);
};

export const adminCapabilityGuard: CanActivateFn = (route) => {
  const auth = inject(PlatformAuthService);
  const router = inject(Router);
  const segment = route.routeConfig?.path ?? '';
  const required = ADMIN_ROUTE_CAPABILITIES[segment];

  if (!required || auth.hasCapability(required)) {
    return true;
  }

  return router.createUrlTree(['/admin/dashboard']);
};
