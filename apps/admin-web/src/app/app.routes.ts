import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth-guard';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { AdminLogin } from './features/auth/admin-login/admin-login';
import { AdminDashboard } from './features/dashboard/admin-dashboard/admin-dashboard';
import { ConsumersPage } from './features/consumers/consumers-page/consumers-page';
import { DoctorsPage } from './features/doctors/doctors-page/doctors-page';
import { DiseasesPage } from './features/diseases/diseases-page/diseases-page';
import { AdminShell } from './layout/admin-shell/admin-shell';
import { DoctorHrComponent } from './features/hr/doctor-hr/doctor-hr';
import { HrUsersComponent } from './features/hr/hr-users/hr-users';
import { EmployeesPage } from './features/employees/employees-page/employees-page';
import { LeavesPage } from './features/leaves/leaves-page/leaves-page';
import { StoresPage } from './features/stores/stores-page/stores-page';
import { ConsultationsPage } from './features/consultations/consultations-page/consultations-page';
import { PayrollPage } from './features/payroll/payroll-page/payroll-page';

export const routes: Routes = [
  { path: ROUTE_PATHS.LOGIN, component: AdminLogin },
  {
    path: '',
    component: AdminShell,
    canActivate: [adminAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: ROUTE_PATHS.DASHBOARD },
      { path: ROUTE_PATHS.DASHBOARD, component: AdminDashboard },
      { path: ROUTE_PATHS.DOCTORS, component: DoctorsPage },
      { path: ROUTE_PATHS.CONSUMERS, component: ConsumersPage },
      { path: ROUTE_PATHS.DISEASES, component: DiseasesPage },
      { path: ROUTE_PATHS.HR, component: DoctorHrComponent },
      { path: ROUTE_PATHS.HR_USERS, component: HrUsersComponent },
      { path: ROUTE_PATHS.EMPLOYEES, component: EmployeesPage },
      { path: ROUTE_PATHS.LEAVES, component: LeavesPage },
      { path: ROUTE_PATHS.STORES, component: StoresPage },
      { path: ROUTE_PATHS.CONSULTATIONS, component: ConsultationsPage },
      { path: ROUTE_PATHS.PAYROLL, component: PayrollPage }
    ]
  },
  { path: '**', redirectTo: '' }
];
