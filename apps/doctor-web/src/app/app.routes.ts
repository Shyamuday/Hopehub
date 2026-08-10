import { Routes } from '@angular/router';
import { doctorAuthGuard } from './core/guards/doctor-auth-guard';
import { providerCapabilityGuard } from './core/guards/provider-capability-guard';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { Login } from './features/auth/login/login';
import { DoctorShell } from './layout/doctor-shell/doctor-shell';
import { WorklistPage } from './features/worklist/worklist-page/worklist-page';
import { DashboardHome } from './features/dashboard/dashboard-home/dashboard-home';
import { AppointmentsPage } from './features/appointments/appointments-page/appointments-page';
import { CaseAnalysisPage } from './features/case-analysis/case-analysis-page/case-analysis-page';
import { PatientsPage } from './features/patients/patients-page/patients-page';
import { ProfilePage } from './features/profile/profile-page/profile-page';
import { MyLeaves } from './features/leaves/my-leaves/my-leaves';
import { SlotsPage } from './features/slots/slots-page/slots-page';
import { EarningsPage } from './features/earnings/earnings-page/earnings-page';
import { PatientScanPage } from './features/scan/patient-scan-page/patient-scan-page';
import { DoctorPatientScanLauncherPage } from './features/scan/patient-scan-launcher-page/patient-scan-launcher-page';
import { RepertoryBrowserPage } from './features/repertory-browser/repertory-browser';
import { DiseasePagesPage } from './features/disease-pages/disease-pages-page';
import { DoctorBlogPage } from './features/blog/doctor-blog-page';
import { OnlineDoctorPage } from './features/online-doctor/online-doctor-page';
import { NotificationsInboxPage } from './features/notifications-inbox/notifications-inbox-page';

export const routes: Routes = [
  { path: ROUTE_PATHS.LOGIN, component: Login },
  {
    path: 'auth/verify-email',
    loadComponent: () =>
      import('./features/auth/email-verification/email-verification').then(
        (m) => m.ProviderEmailVerification,
      ),
  },
  {
    path: '',
    component: DoctorShell,
    canActivate: [doctorAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: ROUTE_PATHS.WORKLIST },
      { path: ROUTE_PATHS.WORKLIST, component: WorklistPage },
      { path: ROUTE_PATHS.DASHBOARD, component: DashboardHome },
      {
        path: `${ROUTE_PATHS.CASE_ANALYSIS}/:consultationId`,
        pathMatch: 'full',
        redirectTo: `${ROUTE_PATHS.CASE_ANALYSIS}/:consultationId/case-analysis`,
      },
      {
        path: `${ROUTE_PATHS.CASE_ANALYSIS}/:consultationId/case-analysis`,
        component: CaseAnalysisPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'caseAnalysis' },
      },
      {
        path: `${ROUTE_PATHS.CASE_ANALYSIS}/:consultationId/prescription`,
        component: AppointmentsPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'prescribe' },
      },
      {
        path: ROUTE_PATHS.APPOINTMENTS,
        component: AppointmentsPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'prescribe' },
      },
      {
        path: ROUTE_PATHS.CASE_ANALYSIS_STUDIO,
        component: CaseAnalysisPage,
        canActivate: [providerCapabilityGuard],
        data: { standalone: true, capability: 'caseAnalysis' },
      },
      {
        path: ROUTE_PATHS.REPERTORY,
        redirectTo: ROUTE_PATHS.CASE_ANALYSIS_STUDIO,
        pathMatch: 'full',
      },
      { path: ROUTE_PATHS.PATIENTS, component: PatientsPage },
      {
        path: ROUTE_PATHS.DISEASE_PAGES,
        component: DiseasePagesPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'treatmentPages' },
      },
      {
        path: ROUTE_PATHS.BLOG,
        component: DoctorBlogPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'content' },
      },
      {
        path: ROUTE_PATHS.ONLINE_DOCTOR,
        component: OnlineDoctorPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'onlineConsult' },
      },
      {
        path: `${ROUTE_PATHS.SESSIONS}/:consultationId`,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'onlineConsult' },
        loadComponent: () =>
          import('./features/live-session/doctor-live-session-page').then(
            (m) => m.DoctorLiveSessionPage,
          ),
      },
      {
        path: ROUTE_PATHS.REPERTORY_BROWSER,
        component: RepertoryBrowserPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'caseAnalysis' },
      },
      { path: ROUTE_PATHS.PROFILE, component: ProfilePage },
      { path: ROUTE_PATHS.LEAVES, component: MyLeaves },
      {
        path: ROUTE_PATHS.SLOTS,
        component: SlotsPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'slots' },
      },
      {
        path: ROUTE_PATHS.EARNINGS,
        component: EarningsPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'earnings' },
      },
      {
        path: ROUTE_PATHS.SCAN,
        component: DoctorPatientScanLauncherPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'scan' },
      },
      { path: ROUTE_PATHS.NOTIFICATIONS_INBOX, component: NotificationsInboxPage },
      {
        path: `${ROUTE_PATHS.PATIENT_SCAN}/:patientCode`,
        component: PatientScanPage,
        canActivate: [providerCapabilityGuard],
        data: { capability: 'scan' },
      },
    ],
  },
  { path: '**', redirectTo: ROUTE_PATHS.WORKLIST },
];
