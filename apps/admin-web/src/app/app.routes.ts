import { type Routes } from '@angular/router';
import { ADMIN_PERMISSIONS } from './core/admin-permissions';
import { adminAuthGuard } from './core/guards/admin-auth-guard';
import { adminPermissionGuard } from './core/guards/admin-permission-guard';
import { AdminLogin } from './features/auth/admin-login/admin-login';
import { ConsultationsPage } from './features/consultations/consultations-page/consultations-page';
import { AdminDashboard } from './features/dashboard/admin-dashboard/admin-dashboard';
import { ConsumersPage } from './features/consumers/consumers-page/consumers-page';
import { DoctorsPage } from './features/doctors/doctors-page/doctors-page';
import { DiseasesPage } from './features/diseases/diseases-page/diseases-page';
import { LocationsPage } from './features/locations/locations-page/locations-page';
import { StaffPage } from './features/staff/staff-page/staff-page';
import { AdminHomeRedirectComponent } from './features/workspace/admin-home-redirect.component';
import { NoAccessComponent } from './features/workspace/no-access.component';
import { AdminShell } from './layout/admin-shell/admin-shell';

const P = ADMIN_PERMISSIONS;

export const routes: Routes = [
  { path: 'login', component: AdminLogin },
  {
    path: '',
    component: AdminShell,
    canActivate: [adminAuthGuard],
    children: [
      { path: '', pathMatch: 'full', component: AdminHomeRedirectComponent },
      { path: 'no-access', component: NoAccessComponent },
      {
        path: 'dashboard',
        component: AdminDashboard,
        canActivate: [adminPermissionGuard],
        data: { permissionsAny: [P.REPORTS_VIEW, P.PAYMENTS_READ, P.AUDIT_READ] }
      },
      {
        path: 'consultations',
        component: ConsultationsPage,
        canActivate: [adminPermissionGuard],
        data: { permissions: [P.CONSULTATIONS_READ] }
      },
      {
        path: 'doctors',
        component: DoctorsPage,
        canActivate: [adminPermissionGuard],
        data: { permissions: [P.DOCTORS_READ] }
      },
      {
        path: 'consumers',
        component: ConsumersPage,
        canActivate: [adminPermissionGuard],
        data: { permissions: [P.CONSUMERS_READ] }
      },
      {
        path: 'diseases',
        component: DiseasesPage,
        canActivate: [adminPermissionGuard],
        data: { permissions: [P.DISEASES_READ] }
      },
      {
        path: 'locations',
        component: LocationsPage,
        canActivate: [adminPermissionGuard],
        data: { permissions: [P.LOCATIONS_READ] }
      },
      {
        path: 'staff',
        component: StaffPage,
        canActivate: [adminPermissionGuard],
        data: { permissions: [P.STAFF_READ] }
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
