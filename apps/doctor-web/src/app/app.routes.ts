import { Routes } from '@angular/router';
import { providerAuthGuard } from './core/guards/provider-auth-guard';
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
    path: '',
    component: DoctorShell,
    canActivate: [providerAuthGuard],
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
      },
      {
        path: `${ROUTE_PATHS.CASE_ANALYSIS}/:consultationId/prescription`,
        component: AppointmentsPage,
      },
      { path: ROUTE_PATHS.APPOINTMENTS, component: AppointmentsPage },
      {
        path: ROUTE_PATHS.CASE_ANALYSIS_STUDIO,
        component: CaseAnalysisPage,
        data: { standalone: true },
      },
      {
        path: ROUTE_PATHS.REPERTORY,
        redirectTo: ROUTE_PATHS.CASE_ANALYSIS_STUDIO,
        pathMatch: 'full',
      },
      { path: ROUTE_PATHS.PATIENTS, component: PatientsPage },
      { path: ROUTE_PATHS.DISEASE_PAGES, component: DiseasePagesPage },
      { path: ROUTE_PATHS.BLOG, component: DoctorBlogPage },
      { path: ROUTE_PATHS.ONLINE_DOCTOR, component: OnlineDoctorPage },
      { path: ROUTE_PATHS.REPERTORY_BROWSER, component: RepertoryBrowserPage },
      { path: ROUTE_PATHS.PROFILE, component: ProfilePage },
      { path: ROUTE_PATHS.LEAVES, component: MyLeaves },
      { path: ROUTE_PATHS.SLOTS, component: SlotsPage },
      { path: ROUTE_PATHS.EARNINGS, component: EarningsPage },
      { path: ROUTE_PATHS.SCAN, component: DoctorPatientScanLauncherPage },
      { path: ROUTE_PATHS.NOTIFICATIONS_INBOX, component: NotificationsInboxPage },
      { path: `${ROUTE_PATHS.PATIENT_SCAN}/:patientCode`, component: PatientScanPage },
    ],
  },
  { path: '**', redirectTo: ROUTE_PATHS.WORKLIST },
];
