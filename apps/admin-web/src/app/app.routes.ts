import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth-guard';
import { adminPermissionGuard } from './core/guards/admin-permission.guard';
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
import { RatesPage } from './features/rates/rates-page/rates-page';
import { PaymentsPage } from './features/payments/payments-page/payments-page';
import { FinancePage } from './features/finance/finance-page/finance-page';
import { AuditPage } from './features/audit/audit-page/audit-page';
import { AdherencePage } from './features/adherence/adherence-page/adherence-page';
import { AnalyticsPage } from './features/analytics/analytics-page/analytics-page';
import { PurchaseOrdersPage } from './features/purchase-orders/purchase-orders-page/purchase-orders-page';
import { AdminUsersPage } from './features/admin-users/admin-users-page/admin-users-page';
import { SuppliersPage } from './features/suppliers/suppliers-page/suppliers-page';
import { MedicinesPage } from './features/medicines/medicines-page/medicines-page';
import { InventoryPage } from './features/inventory/inventory-page/inventory-page';
import { NotificationsPage } from './features/notifications/notifications-page/notifications-page';
import { SecurityPage } from './features/security/security-page/security-page';
import { AdminPatientScanLauncherPage } from './features/scan/admin-patient-scan-launcher-page';
import { EcosystemUsersPage } from './features/ecosystem-users/ecosystem-users-page/ecosystem-users-page';
import { StaffPage } from './features/staff/staff-page/staff-page';
import { VacanciesPage } from './features/vacancies/vacancies-page/vacancies-page';
import { TestimonialsPage } from './features/content/testimonials-page/testimonials-page';
import { FaqPage } from './features/content/faq-page/faq-page';
import { BlogPage } from './features/content/blog-page/blog-page';
import { SiteConfigPage } from './features/content/site-config-page/site-config-page';
import { ChatInboxPage } from './features/content/chat-inbox-page/chat-inbox-page';
import { RewardsPage } from './features/rewards/rewards-page/rewards-page';
import { ClinicalRecordsPage } from './features/clinical-records/clinical-records-page/clinical-records-page';
import { OnlineDoctorsPage } from './features/online-doctors/online-doctors-page/online-doctors-page';
import { AccountPage } from './features/account/account-page/account-page';
import { NotificationsInboxPage } from './features/notifications-inbox/notifications-inbox-page';

const guard = [adminPermissionGuard];

export const routes: Routes = [
  { path: ROUTE_PATHS.LOGIN, component: AdminLogin },
  {
    path: '',
    component: AdminShell,
    canActivate: [adminAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: ROUTE_PATHS.DASHBOARD },
      { path: ROUTE_PATHS.DASHBOARD, component: AdminDashboard, canActivate: guard },
      { path: ROUTE_PATHS.DOCTORS, component: DoctorsPage, canActivate: guard },
      { path: ROUTE_PATHS.CONSUMERS, component: ConsumersPage, canActivate: guard },
      { path: ROUTE_PATHS.SCAN, component: AdminPatientScanLauncherPage, canActivate: guard },
      { path: ROUTE_PATHS.DISEASES, component: DiseasesPage, canActivate: guard },
      { path: ROUTE_PATHS.RATES, component: RatesPage, canActivate: guard },
      { path: ROUTE_PATHS.REWARDS, component: RewardsPage, canActivate: guard },
      { path: ROUTE_PATHS.CLINICAL_RECORDS, component: ClinicalRecordsPage, canActivate: guard },
      { path: ROUTE_PATHS.VACANCIES, component: VacanciesPage, canActivate: guard },
      { path: ROUTE_PATHS.HR, component: DoctorHrComponent, canActivate: guard },
      { path: ROUTE_PATHS.HR_USERS, component: HrUsersComponent, canActivate: guard },
      { path: ROUTE_PATHS.EMPLOYEES, component: EmployeesPage, canActivate: guard },
      { path: ROUTE_PATHS.LEAVES, component: LeavesPage, canActivate: guard },
      { path: ROUTE_PATHS.STORES, component: StoresPage, canActivate: guard },
      { path: ROUTE_PATHS.PURCHASE_ORDERS, component: PurchaseOrdersPage, canActivate: guard },
      { path: ROUTE_PATHS.SUPPLIERS, component: SuppliersPage, canActivate: guard },
      { path: ROUTE_PATHS.MEDICINES, component: MedicinesPage, canActivate: guard },
      { path: ROUTE_PATHS.INVENTORY, component: InventoryPage, canActivate: guard },
      { path: ROUTE_PATHS.NOTIFICATIONS, component: NotificationsPage, canActivate: guard },
      {
        path: ROUTE_PATHS.NOTIFICATIONS_INBOX,
        component: NotificationsInboxPage,
        canActivate: guard,
      },
      { path: ROUTE_PATHS.ADMIN_USERS, component: AdminUsersPage, canActivate: guard },
      { path: ROUTE_PATHS.STAFF, component: StaffPage, canActivate: guard },
      { path: ROUTE_PATHS.ECOSYSTEM_USERS, component: EcosystemUsersPage, canActivate: guard },
      { path: ROUTE_PATHS.CONSULTATIONS, component: ConsultationsPage, canActivate: guard },
      { path: ROUTE_PATHS.ONLINE_DOCTORS, component: OnlineDoctorsPage, canActivate: guard },
      { path: ROUTE_PATHS.PAYMENTS, component: PaymentsPage, canActivate: guard },
      { path: ROUTE_PATHS.AUDIT, component: AuditPage, canActivate: guard },
      { path: ROUTE_PATHS.SECURITY, component: SecurityPage, canActivate: guard },
      { path: ROUTE_PATHS.ADHERENCE, component: AdherencePage, canActivate: guard },
      { path: ROUTE_PATHS.ANALYTICS, component: AnalyticsPage, canActivate: guard },
      { path: ROUTE_PATHS.FINANCE, component: FinancePage, canActivate: guard },
      { path: ROUTE_PATHS.PAYROLL, component: PayrollPage, canActivate: guard },
      { path: ROUTE_PATHS.TESTIMONIALS, component: TestimonialsPage, canActivate: guard },
      { path: ROUTE_PATHS.FAQ, component: FaqPage, canActivate: guard },
      { path: ROUTE_PATHS.BLOG, component: BlogPage, canActivate: guard },
      { path: ROUTE_PATHS.SITE_CONFIG, component: SiteConfigPage, canActivate: guard },
      { path: ROUTE_PATHS.CHAT_INBOX, component: ChatInboxPage, canActivate: guard },
      { path: ROUTE_PATHS.ACCOUNT, component: AccountPage },
    ],
  },
  { path: '**', redirectTo: '' },
];
