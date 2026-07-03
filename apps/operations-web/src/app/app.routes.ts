import { Routes } from '@angular/router';
import { authGuard, capabilityGuard } from './core/guards/auth.guard';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { adminSectionGuard } from './admin/admin.guards';
import { ADMIN_CHILD_ROUTES } from './admin/admin.routes';

export const routes: Routes = [
  {
    path: ROUTE_PATHS.LOGIN,
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/admin-embed-shell.component').then((m) => m.AdminEmbedShellComponent),
    canActivate: [authGuard, adminSectionGuard],
    children: ADMIN_CHILD_ROUTES
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/home-redirect/home-redirect.component').then((m) => m.HomeRedirectComponent)
      },      {
        path: ROUTE_PATHS.DASHBOARD,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: ROUTE_PATHS.EMPLOYEES,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/employees/employees.component').then((m) => m.EmployeesComponent)
      },
      {
        path: ROUTE_PATHS.DOCTORS,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/doctors/doctors.component').then((m) => m.DoctorsComponent)
      },
      {
        path: ROUTE_PATHS.STORE_STAFF,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/store-staff/store-staff.component').then((m) => m.StoreStaffComponent)
      },
      {
        path: ROUTE_PATHS.LEAVES,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/leaves/leaves.component').then((m) => m.LeavesComponent)
      },
      {
        path: ROUTE_PATHS.STORES,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/stores/stores.component').then((m) => m.StoresComponent)
      },
      {
        path: ROUTE_PATHS.PAYROLL,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/payroll/payroll.component').then((m) => m.PayrollComponent)
      },
      {
        path: ROUTE_PATHS.WALK_IN,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/walk-in/walk-in.component').then((m) => m.WalkInComponent)
      },
      {
        path: ROUTE_PATHS.QUEUE,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/queue/queue.component').then((m) => m.QueueComponent)
      },
      {
        path: ROUTE_PATHS.CLINIC_DASHBOARD,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/clinic-dashboard/hub-dashboard.component').then((m) => m.HubDashboardComponent)
      },
      {
        path: ROUTE_PATHS.ROSTER,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/roster/roster.component').then((m) => m.RosterComponent)
      },
      {
        path: ROUTE_PATHS.SCHEDULES,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/schedules/schedules.component').then((m) => m.SchedulesComponent)
      },
      {
        path: ROUTE_PATHS.FINANCE,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/finance/reports.component').then((m) => m.ReportsComponent)
      },
      {
        path: ROUTE_PATHS.BRANCH_DASHBOARD,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/branch-dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: ROUTE_PATHS.FOLLOW_UPS,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/follow-ups/follow-ups.component').then((m) => m.FollowUpsComponent)
      },
      {
        path: ROUTE_PATHS.PATIENTS,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/patient-search/patient-search.component').then((m) => m.PatientSearchComponent)
      },
      {
        path: ROUTE_PATHS.CONSULTATIONS,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/consultations/consultations.component').then((m) => m.ConsultationsComponent)
      },
      {
        path: ROUTE_PATHS.FUNNELS,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/funnels/funnels.component').then((m) => m.FunnelsComponent)
      }
    ]
  },
  { path: '**', redirectTo: ROUTE_PATHS.DASHBOARD }
];
