import { Routes } from '@angular/router';
import { ROUTE_SEO_CONTENT } from './core/constants/route-seo.constants';
import { roleGuard } from './role.guard';

export const routes: Routes = [
  {
    path: 'about',
    loadComponent: () => import('./about.component').then((m) => m.AboutComponent),
    data: ROUTE_SEO_CONTENT.about,
  },
  {
    path: 'treatments',
    loadComponent: () => import('./treatments.component').then((m) => m.TreatmentsComponent),
    data: ROUTE_SEO_CONTENT.treatments,
  },
  {
    path: 'treatments/:slug',
    loadComponent: () => import('./disease-detail.component').then((m) => m.DiseaseDetailComponent),
    data: ROUTE_SEO_CONTENT['treatments/:slug'],
  },
  {
    path: 'talk-to-doctor',
    redirectTo: 'talk-to-provider',
    pathMatch: 'full',
  },
  {
    path: 'talk-to-provider',
    loadComponent: () => import('./talk-to-doctor.component').then((m) => m.TalkToDoctorComponent),
    data: {
      title: 'Talk to a provider now',
      description: 'Instant online consultation with live providers.',
    },
  },
  {
    path: 'patient/instant-consult/:id',
    loadComponent: () =>
      import('./patient-instant-consult-page.component').then(
        (m) => m.PatientInstantConsultPageComponent,
      ),
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      seoTitle: 'Instant consult room | HopeHub Care',
      seoDescription: 'Chat and video call with your online provider.',
    },
  },
  {
    path: 'our-doctors',
    redirectTo: 'our-providers',
    pathMatch: 'full',
  },
  {
    path: 'our-providers',
    loadComponent: () => import('./our-doctors.component').then((m) => m.OurDoctorsComponent),
    data: ROUTE_SEO_CONTENT['our-doctors'],
  },
  {
    path: 'blog',
    loadComponent: () => import('./features/blog/blog.component').then((m) => m.BlogComponent),
    data: ROUTE_SEO_CONTENT.blog,
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./features/blog/blog-detail.component').then((m) => m.BlogDetailComponent),
    data: ROUTE_SEO_CONTENT.blog,
  },
  {
    path: 'testimonials',
    loadComponent: () => import('./testimonials.component').then((m) => m.TestimonialsComponent),
    data: ROUTE_SEO_CONTENT.testimonials,
  },
  {
    path: 'careers',
    loadComponent: () => import('./careers.component').then((m) => m.CareersComponent),
    data: ROUTE_SEO_CONTENT.careers,
  },
  { path: 'hair-fall', redirectTo: 'treatments/hair-fall', pathMatch: 'full' },
  { path: 'skin-care', redirectTo: 'treatments/skin-care', pathMatch: 'full' },
  {
    path: 'chronic-care',
    loadComponent: () => import('./chronic-care.component').then((m) => m.ChronicCareComponent),
    data: ROUTE_SEO_CONTENT['chronic-care'],
  },
  {
    path: 'faq',
    loadComponent: () => import('./faq.component').then((m) => m.FaqComponent),
    data: ROUTE_SEO_CONTENT.faq,
  },
  {
    path: 'why-successful',
    loadComponent: () => import('./why-successful.component').then((m) => m.WhySuccessfulComponent),
    data: ROUTE_SEO_CONTENT['why-successful'],
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact.component').then((m) => m.ContactComponent),
    data: ROUTE_SEO_CONTENT.contact,
  },
  {
    path: 'legal',
    loadComponent: () => import('./legal-hub/legal-hub.component').then((m) => m.LegalHubComponent),
    data: ROUTE_SEO_CONTENT.legal,
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./legal-page/legal-page.component').then((m) => m.LegalPageComponent),
    data: { legalKey: 'privacy', ...ROUTE_SEO_CONTENT['privacy-policy'] },
  },
  {
    path: 'terms-and-conditions',
    loadComponent: () =>
      import('./legal-page/legal-page.component').then((m) => m.LegalPageComponent),
    data: { legalKey: 'terms', ...ROUTE_SEO_CONTENT['terms-and-conditions'] },
  },
  {
    path: 'return-and-exchange-policy',
    loadComponent: () =>
      import('./legal-page/legal-page.component').then((m) => m.LegalPageComponent),
    data: { legalKey: 'returnExchange', ...ROUTE_SEO_CONTENT['return-and-exchange-policy'] },
  },
  {
    path: 'shipping-policy',
    loadComponent: () =>
      import('./legal-page/legal-page.component').then((m) => m.LegalPageComponent),
    data: { legalKey: 'shipping', ...ROUTE_SEO_CONTENT['shipping-policy'] },
  },
  {
    path: 'payment-policy',
    loadComponent: () =>
      import('./legal-page/legal-page.component').then((m) => m.LegalPageComponent),
    data: { legalKey: 'payment', ...ROUTE_SEO_CONTENT['payment-policy'] },
  },
  { path: 'privacy-terms', redirectTo: 'legal', pathMatch: 'full' },
  {
    path: 'safety',
    loadComponent: () => import('./safety.component').then((m) => m.SafetyComponent),
    data: ROUTE_SEO_CONTENT.safety,
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'auth/reset',
    loadComponent: () =>
      import('./auth/auth-reset-callback.component').then((m) => m.AuthResetCallbackComponent),
  },
  {
    path: 'patient/profile',
    redirectTo: 'patient/account/profile',
    pathMatch: 'full',
  },
  {
    path: 'get-app',
    loadComponent: () => import('./get-app-page.component').then((m) => m.GetAppPageComponent),
    data: ROUTE_SEO_CONTENT['get-app'],
  },
  {
    path: 'patient/scan',
    loadComponent: () => import('./user-patient-scan-page').then((m) => m.UserPatientScanPage),
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      ...ROUTE_SEO_CONTENT['patient/dashboard'],
      seoTitle: 'Scan patient ID | HopeHub Care',
    },
  },
  {
    path: 'patient/dashboard',
    loadComponent: () => import('./dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      ...ROUTE_SEO_CONTENT['patient/dashboard'],
    },
  },
  {
    path: 'patient/account',
    loadComponent: () =>
      import('./account/patient-account-shell.component').then(
        (m) => m.PatientAccountShellComponent,
      ),
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      ...ROUTE_SEO_CONTENT['patient/account'],
    },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./account/patient-account-hub.component').then(
            (m) => m.PatientAccountHubComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./account/patient-account-profile-page.component').then(
            (m) => m.PatientAccountProfilePage,
          ),
        data: ROUTE_SEO_CONTENT['patient/account/profile'],
      },
      {
        path: 'addresses',
        loadComponent: () =>
          import('./account/patient-account-addresses-page.component').then(
            (m) => m.PatientAccountAddressesPageComponent,
          ),
        data: ROUTE_SEO_CONTENT['patient/account/addresses'],
      },
      {
        path: 'refer',
        loadComponent: () =>
          import('./account/patient-account-refer-page.component').then(
            (m) => m.PatientAccountReferPageComponent,
          ),
        data: ROUTE_SEO_CONTENT['patient/account/refer'],
      },
      {
        path: 'rewards',
        loadComponent: () =>
          import('./account/patient-account-rewards-page.component').then(
            (m) => m.PatientAccountRewardsPageComponent,
          ),
        data: ROUTE_SEO_CONTENT['patient/account/rewards'],
      },
      {
        path: 'consultations',
        loadComponent: () =>
          import('./account/patient-account-consultations-page.component').then(
            (m) => m.PatientAccountConsultationsPageComponent,
          ),
        data: ROUTE_SEO_CONTENT['patient/account/consultations'],
      },
      {
        path: 'consultations/:id',
        loadComponent: () =>
          import('./account/patient-account-consultation-detail-page.component').then(
            (m) => m.PatientAccountConsultationDetailPageComponent,
          ),
        data: ROUTE_SEO_CONTENT['patient/account/consultations'],
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./account/patient-account-orders-page.component').then(
            (m) => m.PatientAccountOrdersPageComponent,
          ),
        data: ROUTE_SEO_CONTENT['patient/account/orders'],
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./account/patient-account-order-detail-page.component').then(
            (m) => m.PatientAccountOrderDetailPageComponent,
          ),
        data: ROUTE_SEO_CONTENT['patient/account/orders'],
      },
      {
        path: 'lab-results',
        loadComponent: () =>
          import('./account/patient-account-lab-results-page.component').then(
            (m) => m.PatientAccountLabResultsPageComponent,
          ),
        data: ROUTE_SEO_CONTENT['patient/account/lab-results'],
      },
      {
        path: 'card',
        loadComponent: () =>
          import('./account/patient-account-card-page.component').then(
            (m) => m.PatientAccountCardPageComponent,
          ),
        data: ROUTE_SEO_CONTENT['patient/account/card'],
      },
      {
        path: 'permissions',
        loadComponent: () =>
          import('./account/patient-account-permissions-page.component').then(
            (m) => m.PatientAccountPermissionsPageComponent,
          ),
        data: {
          seoTitle: 'App permissions | HopeHub Care',
          seoDescription:
            'Learn why HopeHub asks for camera, microphone, and notification access — and how you stay in control.',
        },
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./home.component').then((m) => m.HomeComponent),
    data: ROUTE_SEO_CONTENT.home,
  },
  {
    path: '**',
    loadComponent: () => import('./not-found-page.component').then((m) => m.NotFoundPageComponent),
    data: {
      seoTitle: 'Page not found | HopeHub Care',
      seoDescription: 'The page you requested could not be found.',
    },
  },
];
