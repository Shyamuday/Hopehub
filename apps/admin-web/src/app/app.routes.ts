import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth-guard';
import { adminPermissionGuard } from './core/guards/admin-permission.guard';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';

const guard = [adminPermissionGuard];

export const routes: Routes = [
  {
    path: ROUTE_PATHS.LOGIN,
    loadComponent: () =>
      import('./features/auth/admin-login/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: 'auth/verify-email',
    loadComponent: () =>
      import('./features/auth/email-verification/email-verification').then(
        (m) => m.AdminEmailVerification,
      ),
  },
  {
    path: '',
    loadComponent: () => import('./layout/admin-shell/admin-shell').then((m) => m.AdminShell),
    canActivate: [adminAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: ROUTE_PATHS.DASHBOARD },
      {
        path: ROUTE_PATHS.DASHBOARD,
        loadComponent: () =>
          import('./features/dashboard/admin-dashboard/admin-dashboard').then(
            (m) => m.AdminDashboard,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.DOCTORS,
        loadComponent: () =>
          import('./features/doctors/doctors-page/doctors-page').then((m) => m.DoctorsPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.CONSUMERS,
        loadComponent: () =>
          import('./features/consumers/consumers-page/consumers-page').then((m) => m.ConsumersPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.SCAN,
        loadComponent: () =>
          import('./features/scan/admin-patient-scan-launcher-page').then(
            (m) => m.AdminPatientScanLauncherPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.DISEASES,
        loadComponent: () =>
          import('./features/diseases/diseases-page/diseases-page').then((m) => m.DiseasesPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.RATES,
        loadComponent: () =>
          import('./features/rates/rates-page/rates-page').then((m) => m.RatesPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.HOPE_HUB_OFFERS,
        loadComponent: () =>
          import('./features/hope-hub-offers/hope-hub-offers-page').then(
            (m) => m.HopeHubOffersPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.CONSUMER_FLOWS,
        loadComponent: () =>
          import('./features/consumer-flows/consumer-flows-page').then((m) => m.ConsumerFlowsPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.LISTENER_SCREENING,
        loadComponent: () =>
          import('./features/listener-screening/listener-screening-page').then(
            (m) => m.ListenerScreeningPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.PROVIDER_ROLES,
        loadComponent: () =>
          import('./features/provider-roles/provider-roles-page').then((m) => m.ProviderRolesPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.ASSESSMENT_DEFINITIONS,
        loadComponent: () =>
          import('./features/assessment-definitions/assessment-definitions-page').then(
            (m) => m.AssessmentDefinitionsPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.PRACTICES,
        loadComponent: () =>
          import('./features/practices/practices-page').then((m) => m.PracticesPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.LIFESTYLE_TIPS,
        loadComponent: () =>
          import('./features/lifestyle-tips-admin/lifestyle-tips-admin-page').then(
            (m) => m.LifestyleTipsAdminPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.REWARDS,
        loadComponent: () =>
          import('./features/rewards/rewards-page/rewards-page').then((m) => m.RewardsPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.CLINICAL_RECORDS,
        loadComponent: () =>
          import('./features/clinical-records/clinical-records-page/clinical-records-page').then(
            (m) => m.ClinicalRecordsPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.VACANCIES,
        loadComponent: () =>
          import('./features/vacancies/vacancies-page/vacancies-page').then((m) => m.VacanciesPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.COUNSELLOR_APPLICATIONS,
        loadComponent: () =>
          import('./features/counsellor-applications/counsellor-applications-page').then(
            (m) => m.CounsellorApplicationsPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.HR,
        loadComponent: () =>
          import('./features/hr/doctor-hr/doctor-hr').then((m) => m.DoctorHrComponent),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.HR_USERS,
        loadComponent: () =>
          import('./features/hr/hr-users/hr-users').then((m) => m.HrUsersComponent),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.EMPLOYEES,
        loadComponent: () =>
          import('./features/employees/employees-page/employees-page').then((m) => m.EmployeesPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.LEAVES,
        loadComponent: () =>
          import('./features/leaves/leaves-page/leaves-page').then((m) => m.LeavesPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.STORES,
        loadComponent: () =>
          import('./features/stores/stores-page/stores-page').then((m) => m.StoresPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.PURCHASE_ORDERS,
        loadComponent: () =>
          import('./features/purchase-orders/purchase-orders-page/purchase-orders-page').then(
            (m) => m.PurchaseOrdersPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.SUPPLIERS,
        loadComponent: () =>
          import('./features/suppliers/suppliers-page/suppliers-page').then((m) => m.SuppliersPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.MEDICINES,
        loadComponent: () =>
          import('./features/medicines/medicines-page/medicines-page').then((m) => m.MedicinesPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.INVENTORY,
        loadComponent: () =>
          import('./features/inventory/inventory-page/inventory-page').then((m) => m.InventoryPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.NOTIFICATIONS,
        loadComponent: () =>
          import('./features/notifications/notifications-page/notifications-page').then(
            (m) => m.NotificationsPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.NOTIFICATIONS_INBOX,
        loadComponent: () =>
          import('./features/notifications-inbox/notifications-inbox-page').then(
            (m) => m.NotificationsInboxPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.TELEGRAM_BOTS,
        loadComponent: () =>
          import('./features/telegram-bots/telegram-bots-page/telegram-bots-page').then(
            (m) => m.TelegramBotsPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.GROUP_HELP,
        loadComponent: () =>
          import('./features/group-help/group-help-page').then((m) => m.GroupHelpPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.TELEGRAM_CONTENT_NETWORK,
        loadComponent: () =>
          import('./features/telegram-content-network/telegram-content-network-page').then(
            (m) => m.TelegramContentNetworkPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.ADMIN_USERS,
        loadComponent: () =>
          import('./features/admin-users/admin-users-page/admin-users-page').then(
            (m) => m.AdminUsersPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.STAFF,
        loadComponent: () =>
          import('./features/staff/staff-page/staff-page').then((m) => m.StaffPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.ECOSYSTEM_USERS,
        loadComponent: () =>
          import('./features/ecosystem-users/ecosystem-users-page/ecosystem-users-page').then(
            (m) => m.EcosystemUsersPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.CONSULTATIONS,
        loadComponent: () =>
          import('./features/consultations/consultations-page/consultations-page').then(
            (m) => m.ConsultationsPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.FOLLOW_UPS,
        loadComponent: () =>
          import('./features/follow-ups/follow-ups-page').then((m) => m.FollowUpsPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.SAFETY_FLAGS,
        loadComponent: () =>
          import('./features/safety-flags/safety-flags-page').then((m) => m.SafetyFlagsPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.ONLINE_DOCTORS,
        loadComponent: () =>
          import('./features/online-doctors/online-doctors-page/online-doctors-page').then(
            (m) => m.OnlineDoctorsPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.CALL_HEALTH,
        loadComponent: () =>
          import('./features/call-health/call-health-page').then((m) => m.CallHealthPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.PAYMENTS,
        loadComponent: () =>
          import('./features/payments/payments-page/payments-page').then((m) => m.PaymentsPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.DONATIONS,
        loadComponent: () =>
          import('./features/donations/donations-page').then((m) => m.DonationsPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.AUDIT,
        loadComponent: () =>
          import('./features/audit/audit-page/audit-page').then((m) => m.AuditPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.SECURITY,
        loadComponent: () =>
          import('./features/security/security-page/security-page').then((m) => m.SecurityPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.ADHERENCE,
        loadComponent: () =>
          import('./features/adherence/adherence-page/adherence-page').then((m) => m.AdherencePage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.ANALYTICS,
        loadComponent: () =>
          import('./features/analytics/analytics-page/analytics-page').then((m) => m.AnalyticsPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.FINANCE,
        loadComponent: () =>
          import('./features/finance/finance-page/finance-page').then((m) => m.FinancePage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.PAYROLL,
        loadComponent: () =>
          import('./features/payroll/payroll-page/payroll-page').then((m) => m.PayrollPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.TESTIMONIALS,
        loadComponent: () =>
          import('./features/content/testimonials-page/testimonials-page').then(
            (m) => m.TestimonialsPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.FAQ,
        loadComponent: () => import('./features/content/faq-page/faq-page').then((m) => m.FaqPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.BLOG,
        loadComponent: () =>
          import('./features/content/blog-page/blog-page').then((m) => m.BlogPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.SITE_CONFIG,
        loadComponent: () =>
          import('./features/content/site-config-page/site-config-page').then(
            (m) => m.SiteConfigPage,
          ),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.CHAT_INBOX,
        loadComponent: () =>
          import('./features/content/chat-inbox-page/chat-inbox-page').then((m) => m.ChatInboxPage),
        canActivate: guard,
      },
      {
        path: ROUTE_PATHS.ACCOUNT,
        loadComponent: () =>
          import('./features/account/account-page/account-page').then((m) => m.AccountPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
