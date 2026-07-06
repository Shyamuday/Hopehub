import { Routes } from '@angular/router';
import { authGuard, capabilityGuard, storeCapabilityGuard } from './core/guards/auth.guard';
import {
  ROUTE_PATHS,
  STORE_COUNTER_PATHS,
  STORE_MANAGER_PATHS
} from './core/constants/app-routes.constants';
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
      },
      {
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
        path: ROUTE_PATHS.SCAN,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/patient-scan/patient-scan-launcher-page').then((m) => m.PatientScanLauncherPage)
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
      },
      {
        path: ROUTE_PATHS.ORDERS,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/orders/orders.component').then((m) => m.OrdersComponent)
      },
      {
        path: ROUTE_PATHS.WAREHOUSE,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/warehouse-dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: ROUTE_PATHS.WAREHOUSE_TRANSFERS,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/warehouse-transfers/transfers.component').then((m) => m.TransfersComponent)
      },
      {
        path: ROUTE_PATHS.PARTNER_DELIVERIES,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/partner-deliveries/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: ROUTE_PATHS.DELIVERY_ORDERS,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/delivery-orders/orders.component').then((m) => m.OrdersComponent)
      },
      {
        path: ROUTE_PATHS.LAB_REFERRALS,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/lab-referrals/referrals.component').then((m) => m.ReferralsComponent)
      },
      {
        path: ROUTE_PATHS.ACCOUNTS,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/accounts/accounts.component').then((m) => m.AccountsComponent)
      },
      {
        path: ROUTE_PATHS.CLAIMS,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/claims/claims.component').then((m) => m.ClaimsComponent)
      },
      {
        path: ROUTE_PATHS.STORE,
        canActivate: [storeCapabilityGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: STORE_COUNTER_PATHS.DASHBOARD
          },
          {
            path: STORE_COUNTER_PATHS.DASHBOARD,
            loadComponent: () =>
              import('./pages/store/dashboard/dashboard.component').then((m) => m.DashboardComponent)
          },
          {
            path: STORE_COUNTER_PATHS.SEARCH,
            loadComponent: () =>
              import('./pages/store/search/search.component').then((m) => m.SearchComponent)
          },
          {
            path: STORE_COUNTER_PATHS.PATIENTS,
            loadComponent: () =>
              import('./pages/store/patients/patients-page').then((m) => m.PatientsPage)
          },
          {
            path: STORE_COUNTER_PATHS.MEDICINE_DETAIL,
            loadComponent: () =>
              import('./pages/store/medicine-detail/medicine-detail.component').then(
                (m) => m.MedicineDetailComponent
              )
          },
          {
            path: STORE_COUNTER_PATHS.STOCK_IN,
            loadComponent: () =>
              import('./pages/store/stock-in/stock-in.component').then((m) => m.StockInComponent)
          },
          {
            path: STORE_COUNTER_PATHS.STOCK_OUT,
            loadComponent: () =>
              import('./pages/store/stock-out/stock-out.component').then((m) => m.StockOutComponent)
          },
          {
            path: STORE_COUNTER_PATHS.ALERTS,
            loadComponent: () =>
              import('./pages/store/alerts/alerts.component').then((m) => m.AlertsComponent)
          },
          {
            path: STORE_COUNTER_PATHS.RACK_MAP,
            loadComponent: () =>
              import('./pages/store/rack-map/rack-map.component').then((m) => m.RackMapComponent)
          },
          {
            path: STORE_COUNTER_PATHS.MEDICINES,
            loadComponent: () =>
              import('./pages/store/medicines-admin/medicines-admin.component').then(
                (m) => m.MedicinesAdminComponent
              )
          },
          {
            path: STORE_COUNTER_PATHS.MOVEMENTS,
            loadComponent: () =>
              import('./pages/store/movements/movements.component').then((m) => m.MovementsComponent)
          },
          {
            path: STORE_COUNTER_PATHS.STAFF_ACTIVITY,
            loadComponent: () =>
              import('./pages/store/staff-activity/staff-activity.component').then(
                (m) => m.StaffActivityComponent
              )
          },
          {
            path: STORE_COUNTER_PATHS.STAFF_HR,
            loadComponent: () =>
              import('./pages/store/staff-hr/staff-hr.component').then((m) => m.StaffHrComponent)
          },
          {
            path: STORE_COUNTER_PATHS.MY_PAY,
            loadComponent: () =>
              import('./pages/store/my-pay/my-pay-page').then((m) => m.MyPayPage)
          },
          {
            path: STORE_COUNTER_PATHS.STORE_EXPENSES,
            loadComponent: () =>
              import('./pages/store/store-expenses/store-expenses-page').then((m) => m.StoreExpensesPage)
          },
          {
            path: STORE_COUNTER_PATHS.PATIENT_SCAN,
            loadComponent: () =>
              import('./pages/store/patient-scan/patient-scan.component').then(
                (m) => m.PatientScanComponent
              )
          }
        ]
      },
      {
        path: ROUTE_PATHS.STORE_MANAGER,
        canActivate: [storeCapabilityGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: STORE_MANAGER_PATHS.DASHBOARD
          },
          {
            path: STORE_MANAGER_PATHS.DASHBOARD,
            loadComponent: () =>
              import('./pages/store/dashboard/dashboard.component').then((m) => m.DashboardComponent)
          },
          {
            path: STORE_MANAGER_PATHS.PATIENTS,
            loadComponent: () =>
              import('./pages/store/patients/patients-page').then((m) => m.PatientsPage)
          },
          {
            path: STORE_MANAGER_PATHS.SEARCH,
            loadComponent: () =>
              import('./pages/store/search/search.component').then((m) => m.SearchComponent)
          },
          {
            path: STORE_MANAGER_PATHS.MEDICINE_DETAIL,
            loadComponent: () =>
              import('./pages/store/medicine-detail/medicine-detail.component').then(
                (m) => m.MedicineDetailComponent
              )
          },
          {
            path: STORE_MANAGER_PATHS.ALERTS,
            loadComponent: () =>
              import('./pages/store/alerts/alerts.component').then((m) => m.AlertsComponent)
          },
          {
            path: STORE_MANAGER_PATHS.RACK_MAP,
            loadComponent: () =>
              import('./pages/store/rack-map/rack-map.component').then((m) => m.RackMapComponent)
          },
          {
            path: STORE_MANAGER_PATHS.MEDICINES,
            loadComponent: () =>
              import('./pages/store/medicines-admin/medicines-admin.component').then(
                (m) => m.MedicinesAdminComponent
              )
          },
          {
            path: STORE_MANAGER_PATHS.MOVEMENTS,
            loadComponent: () =>
              import('./pages/store/movements/movements.component').then((m) => m.MovementsComponent)
          },
          {
            path: STORE_MANAGER_PATHS.STAFF_ACTIVITY,
            loadComponent: () =>
              import('./pages/store/staff-activity/staff-activity.component').then(
                (m) => m.StaffActivityComponent
              )
          },
          {
            path: STORE_MANAGER_PATHS.STAFF_HR,
            loadComponent: () =>
              import('./pages/store/staff-hr/staff-hr.component').then((m) => m.StaffHrComponent)
          },
          {
            path: STORE_MANAGER_PATHS.STORE_EXPENSES,
            loadComponent: () =>
              import('./pages/store/store-expenses/store-expenses-page').then((m) => m.StoreExpensesPage)
          },
          {
            path: STORE_MANAGER_PATHS.PATIENT_SCAN,
            loadComponent: () =>
              import('./pages/store/patient-scan/patient-scan.component').then(
                (m) => m.PatientScanComponent
              )
          },
          {
            path: STORE_MANAGER_PATHS.PURCHASE_ORDERS,
            loadComponent: () =>
              import('./pages/store/manager/purchase-orders/purchase-orders-page').then(
                (m) => m.PurchaseOrdersPage
              )
          },
          {
            path: STORE_MANAGER_PATHS.STOCK_TRANSFERS,
            loadComponent: () =>
              import('./pages/store/manager/stock-transfers/stock-transfers-page').then(
                (m) => m.StockTransfersPage
              )
          },
          {
            path: STORE_MANAGER_PATHS.DELIVERIES,
            loadComponent: () =>
              import('./pages/store/manager/deliveries/deliveries-page').then((m) => m.DeliveriesPage)
          }
        ]
      }
    ]
  },
  { path: '**', redirectTo: ROUTE_PATHS.DASHBOARD }
];

