import { Routes } from '@angular/router';
import { doctorAuthGuard } from './core/guards/doctor-auth-guard';
import { providerCapabilityGuard } from './core/guards/provider-capability-guard';
import { providerOnboardingGuard } from './core/guards/provider-onboarding-guard';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';

export const routes: Routes = [
  {
    path: ROUTE_PATHS.LOGIN,
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'auth/verify-email',
    loadComponent: () =>
      import('./features/auth/email-verification/email-verification').then(
        (m) => m.ProviderEmailVerification,
      ),
  },
  {
    path: ROUTE_PATHS.SUPPORT,
    loadComponent: () =>
      import('./features/support/provider-support-page/provider-support-page').then(
        (m) => m.ProviderSupportPage,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/support/provider-support-home-redirect').then(
        (m) => m.ProviderSupportHomeRedirect,
      ),
  },
  {
    path: '',
    loadComponent: () => import('./layout/doctor-shell/doctor-shell').then((m) => m.DoctorShell),
    canActivate: [doctorAuthGuard],
    children: [
      {
        path: ROUTE_PATHS.WELCOME,
        loadComponent: () =>
          import('./features/onboarding/provider-path-page/provider-path-page').then(
            (m) => m.ProviderPathPage,
          ),
      },
      {
        path: ROUTE_PATHS.LISTENER_SCREENING,
        loadComponent: () =>
          import('./features/onboarding/listener-screening-page/listener-screening-page').then(
            (m) => m.ListenerScreeningPage,
          ),
        canActivate: [providerCapabilityGuard],
        data: { capability: 'listenerSupport' },
      },
      {
        path: ROUTE_PATHS.WORKLIST,
        loadComponent: () =>
          import('./features/worklist/worklist-page/worklist-page').then((m) => m.WorklistPage),
        canActivate: [providerOnboardingGuard],
      },
      {
        path: ROUTE_PATHS.DASHBOARD,
        loadComponent: () =>
          import('./features/dashboard/dashboard-home/dashboard-home').then((m) => m.DashboardHome),
      },
      {
        path: `${ROUTE_PATHS.CASE_ANALYSIS}/:consultationId`,
        pathMatch: 'full',
        redirectTo: `${ROUTE_PATHS.CASE_ANALYSIS}/:consultationId/case-analysis`,
      },
      {
        path: `${ROUTE_PATHS.CASE_ANALYSIS}/:consultationId/case-analysis`,
        loadComponent: () =>
          import('./features/case-analysis/case-analysis-page/case-analysis-page').then(
            (m) => m.CaseAnalysisPage,
          ),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'caseAnalysis' },
      },
      {
        path: `${ROUTE_PATHS.CASE_ANALYSIS}/:consultationId/prescription`,
        loadComponent: () =>
          import('./features/appointments/appointments-page/appointments-page').then(
            (m) => m.AppointmentsPage,
          ),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'prescribe' },
      },
      {
        path: ROUTE_PATHS.APPOINTMENTS,
        loadComponent: () =>
          import('./features/appointments/appointments-page/appointments-page').then(
            (m) => m.AppointmentsPage,
          ),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'prescribe' },
      },
      {
        path: ROUTE_PATHS.CASE_ANALYSIS_STUDIO,
        loadComponent: () =>
          import('./features/case-analysis/case-analysis-page/case-analysis-page').then(
            (m) => m.CaseAnalysisPage,
          ),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { standalone: true, capability: 'caseAnalysis' },
      },
      {
        path: ROUTE_PATHS.REPERTORY,
        redirectTo: ROUTE_PATHS.CASE_ANALYSIS_STUDIO,
        pathMatch: 'full',
      },
      {
        path: ROUTE_PATHS.PATIENTS,
        loadComponent: () =>
          import('./features/patients/patients-page/patients-page').then((m) => m.PatientsPage),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'patients' },
      },
      {
        path: ROUTE_PATHS.DISEASE_PAGES,
        loadComponent: () =>
          import('./features/disease-pages/disease-pages-page').then((m) => m.DiseasePagesPage),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'treatmentPages' },
      },
      {
        path: ROUTE_PATHS.BLOG,
        loadComponent: () =>
          import('./features/blog/doctor-blog-page').then((m) => m.DoctorBlogPage),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'content' },
      },
      {
        path: ROUTE_PATHS.ONLINE_DOCTOR,
        loadComponent: () =>
          import('./features/online-doctor/online-doctor-page').then((m) => m.OnlineDoctorPage),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'onlineConsult' },
      },
      {
        path: `${ROUTE_PATHS.SESSIONS}/:consultationId`,
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'onlineConsult' },
        loadComponent: () =>
          import('./features/live-session/doctor-live-session-page').then(
            (m) => m.DoctorLiveSessionPage,
          ),
      },
      {
        path: ROUTE_PATHS.REPERTORY_BROWSER,
        loadComponent: () =>
          import('./features/repertory-browser/repertory-browser').then(
            (m) => m.RepertoryBrowserPage,
          ),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'caseAnalysis' },
      },
      {
        path: ROUTE_PATHS.PROFILE,
        loadComponent: () =>
          import('./features/profile/profile-page/profile-page').then((m) => m.ProfilePage),
      },
      {
        path: ROUTE_PATHS.LEAVES,
        loadComponent: () =>
          import('./features/leaves/my-leaves/my-leaves').then((m) => m.MyLeaves),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'leaves' },
      },
      {
        path: ROUTE_PATHS.SLOTS,
        loadComponent: () =>
          import('./features/slots/slots-page/slots-page').then((m) => m.SlotsPage),
        canActivate: [providerCapabilityGuard],
        data: { capability: 'slots' },
      },
      {
        path: ROUTE_PATHS.EARNINGS,
        loadComponent: () =>
          import('./features/earnings/earnings-page/earnings-page').then((m) => m.EarningsPage),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'earnings' },
      },
      {
        path: ROUTE_PATHS.FEEDBACK,
        loadComponent: () =>
          import('./features/provider-feedback/provider-feedback-page').then(
            (m) => m.ProviderFeedbackPage,
          ),
      },
      {
        path: ROUTE_PATHS.SHARE,
        loadComponent: () =>
          import('./features/provider-share/provider-share-page').then((m) => m.ProviderSharePage),
      },
      {
        path: ROUTE_PATHS.SCAN,
        loadComponent: () =>
          import('./features/scan/patient-scan-launcher-page/patient-scan-launcher-page').then(
            (m) => m.DoctorPatientScanLauncherPage,
          ),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'scan' },
      },
      {
        path: ROUTE_PATHS.NOTIFICATIONS_INBOX,
        loadComponent: () =>
          import('./features/notifications-inbox/notifications-inbox-page').then(
            (m) => m.NotificationsInboxPage,
          ),
        canActivate: [providerOnboardingGuard],
      },
      {
        path: `${ROUTE_PATHS.PATIENT_SCAN}/:patientCode`,
        loadComponent: () =>
          import('./features/scan/patient-scan-page/patient-scan-page').then(
            (m) => m.PatientScanPage,
          ),
        canActivate: [providerOnboardingGuard, providerCapabilityGuard],
        data: { capability: 'scan' },
      },
    ],
  },
  { path: '**', redirectTo: ROUTE_PATHS.WORKLIST },
];
