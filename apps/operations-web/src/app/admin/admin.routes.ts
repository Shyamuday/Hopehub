import { Routes } from '@angular/router';
import { ROUTE_PATHS } from '@vitalis/admin-console/core/constants/app-routes.constants';
import { adminCapabilityGuard } from './admin.guards';

const guard = [adminCapabilityGuard];

export const ADMIN_CHILD_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: ROUTE_PATHS.DASHBOARD },
  {
    path: ROUTE_PATHS.DASHBOARD,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/dashboard/admin-dashboard/admin-dashboard').then(
        (m) => m.AdminDashboard
      )
  },
  {
    path: ROUTE_PATHS.DOCTORS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/doctors/doctors-page/doctors-page').then((m) => m.DoctorsPage)
  },
  {
    path: ROUTE_PATHS.CONSUMERS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/consumers/consumers-page/consumers-page').then(
        (m) => m.ConsumersPage
      )
  },
  {
    path: ROUTE_PATHS.DISEASES,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/diseases/diseases-page/diseases-page').then((m) => m.DiseasesPage)
  },
  {
    path: ROUTE_PATHS.HR,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/hr/doctor-hr/doctor-hr').then((m) => m.DoctorHrComponent)
  },
  {
    path: ROUTE_PATHS.HR_USERS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/hr/hr-users/hr-users').then((m) => m.HrUsersComponent)
  },
  {
    path: ROUTE_PATHS.EMPLOYEES,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/employees/employees-page/employees-page').then(
        (m) => m.EmployeesPage
      )
  },
  {
    path: ROUTE_PATHS.LEAVES,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/leaves/leaves-page/leaves-page').then((m) => m.LeavesPage)
  },
  {
    path: ROUTE_PATHS.STORES,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/stores/stores-page/stores-page').then((m) => m.StoresPage)
  },
  {
    path: ROUTE_PATHS.PURCHASE_ORDERS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/purchase-orders/purchase-orders-page/purchase-orders-page').then(
        (m) => m.PurchaseOrdersPage
      )
  },
  {
    path: ROUTE_PATHS.SUPPLIERS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/suppliers/suppliers-page/suppliers-page').then(
        (m) => m.SuppliersPage
      )
  },
  {
    path: ROUTE_PATHS.MEDICINES,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/medicines/medicines-page/medicines-page').then(
        (m) => m.MedicinesPage
      )
  },
  {
    path: ROUTE_PATHS.INVENTORY,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/inventory/inventory-page/inventory-page').then(
        (m) => m.InventoryPage
      )
  },
  {
    path: ROUTE_PATHS.NOTIFICATIONS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/notifications/notifications-page/notifications-page').then(
        (m) => m.NotificationsPage
      )
  },
  {
    path: ROUTE_PATHS.ADMIN_USERS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/admin-users/admin-users-page/admin-users-page').then(
        (m) => m.AdminUsersPage
      )
  },
  {
    path: ROUTE_PATHS.ECOSYSTEM_USERS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/ecosystem-users/ecosystem-users-page/ecosystem-users-page').then(
        (m) => m.EcosystemUsersPage
      )
  },
  {
    path: ROUTE_PATHS.CONSULTATIONS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/consultations/consultations-page/consultations-page').then(
        (m) => m.ConsultationsPage
      )
  },
  {
    path: ROUTE_PATHS.PAYMENTS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/payments/payments-page/payments-page').then(
        (m) => m.PaymentsPage
      )
  },
  {
    path: ROUTE_PATHS.AUDIT,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/audit/audit-page/audit-page').then((m) => m.AuditPage)
  },
  {
    path: ROUTE_PATHS.SECURITY,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/security/security-page/security-page').then(
        (m) => m.SecurityPage
      )
  },
  {
    path: ROUTE_PATHS.ADHERENCE,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/adherence/adherence-page/adherence-page').then(
        (m) => m.AdherencePage
      )
  },
  {
    path: ROUTE_PATHS.ANALYTICS,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/analytics/analytics-page/analytics-page').then(
        (m) => m.AnalyticsPage
      )
  },
  {
    path: ROUTE_PATHS.FINANCE,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/finance/finance-page/finance-page').then((m) => m.FinancePage)
  },
  {
    path: ROUTE_PATHS.PAYROLL,
    canActivate: guard,
    loadComponent: () =>
      import('@vitalis/admin-console/features/payroll/payroll-page/payroll-page').then((m) => m.PayrollPage)
  }
];
