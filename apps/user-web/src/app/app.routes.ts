import { Routes } from '@angular/router';
import { ROUTE_SEO_CONTENT } from './core/constants/public-site-content.constants';
import { AboutComponent } from './about.component';
import { BlogComponent } from './features/blog/blog.component';
import { BlogDetailComponent } from './features/blog/blog-detail.component';
import { CareersComponent } from './careers.component';
import { DashboardComponent } from './dashboard.component';
import { ChronicCareComponent } from './chronic-care.component';
import { ContactComponent } from './contact.component';
import { DiseaseDetailComponent } from './disease-detail.component';
import { FaqComponent } from './faq.component';
import { OurDoctorsComponent } from './our-doctors.component';
import { LegalHubComponent } from './legal-hub/legal-hub.component';
import { LegalPageComponent } from './legal-page/legal-page.component';
import { SafetyComponent } from './safety.component';
import { TestimonialsComponent } from './testimonials.component';
import { TreatmentsComponent } from './treatments.component';
import { WhySuccessfulComponent } from './why-successful.component';
import { roleGuard } from './role.guard';
import { HomeComponent } from './home.component';
import { AuthResetCallbackComponent } from './auth/auth-reset-callback.component';
import { PatientAccountShellComponent } from './account/patient-account-shell.component';
import { PatientAccountHubComponent } from './account/patient-account-hub.component';
import { PatientAccountProfilePage } from './account/patient-account-profile-page.component';
import { PatientAccountAddressesPageComponent } from './account/patient-account-addresses-page.component';
import { PatientAccountReferPageComponent } from './account/patient-account-refer-page.component';
import { PatientAccountRewardsPageComponent } from './account/patient-account-rewards-page.component';
import { PatientAccountConsultationsPageComponent } from './account/patient-account-consultations-page.component';
import { PatientAccountOrdersPageComponent } from './account/patient-account-orders-page.component';
import { PatientAccountOrderDetailPageComponent } from './account/patient-account-order-detail-page.component';
import { PatientAccountLabResultsPageComponent } from './account/patient-account-lab-results-page.component';
import { PatientAccountConsultationDetailPageComponent } from './account/patient-account-consultation-detail-page.component';
import { PatientAccountCardPageComponent } from './account/patient-account-card-page.component';
import { PatientAccountPermissionsPageComponent } from './account/patient-account-permissions-page.component';
import { TalkToDoctorComponent } from './talk-to-doctor.component';
import { PatientInstantConsultPageComponent } from './patient-instant-consult-page.component';
import { NotFoundPageComponent } from './not-found-page.component';

export const routes: Routes = [
  {
    path: 'about',
    component: AboutComponent,
    data: ROUTE_SEO_CONTENT.about,
  },
  {
    path: 'treatments',
    component: TreatmentsComponent,
    data: ROUTE_SEO_CONTENT.treatments,
  },
  {
    path: 'treatments/:slug',
    component: DiseaseDetailComponent,
    data: ROUTE_SEO_CONTENT['treatments/:slug'],
  },
  {
    path: 'talk-to-doctor',
    component: TalkToDoctorComponent,
    data: {
      title: 'Talk to a doctor now',
      description: 'Instant online consultation with live doctors.',
    },
  },
  {
    path: 'patient/instant-consult/:id',
    component: PatientInstantConsultPageComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      seoTitle: 'Instant consult room | HopeHub Care',
      seoDescription: 'Chat and video call with your online doctor.',
    },
  },
  {
    path: 'our-doctors',
    component: OurDoctorsComponent,
    data: ROUTE_SEO_CONTENT['our-doctors'],
  },
  {
    path: 'blog',
    component: BlogComponent,
    data: ROUTE_SEO_CONTENT.blog,
  },
  {
    path: 'blog/:slug',
    component: BlogDetailComponent,
    data: ROUTE_SEO_CONTENT.blog,
  },
  {
    path: 'testimonials',
    component: TestimonialsComponent,
    data: ROUTE_SEO_CONTENT.testimonials,
  },
  {
    path: 'careers',
    component: CareersComponent,
    data: ROUTE_SEO_CONTENT.careers,
  },
  { path: 'hair-fall', redirectTo: 'treatments/hair-fall', pathMatch: 'full' },
  { path: 'skin-care', redirectTo: 'treatments/skin-care', pathMatch: 'full' },
  {
    path: 'chronic-care',
    component: ChronicCareComponent,
    data: ROUTE_SEO_CONTENT['chronic-care'],
  },
  {
    path: 'faq',
    component: FaqComponent,
    data: ROUTE_SEO_CONTENT.faq,
  },
  {
    path: 'why-successful',
    component: WhySuccessfulComponent,
    data: ROUTE_SEO_CONTENT['why-successful'],
  },
  {
    path: 'contact',
    component: ContactComponent,
    data: ROUTE_SEO_CONTENT.contact,
  },
  {
    path: 'legal',
    component: LegalHubComponent,
    data: ROUTE_SEO_CONTENT.legal,
  },
  {
    path: 'privacy-policy',
    component: LegalPageComponent,
    data: { legalKey: 'privacy', ...ROUTE_SEO_CONTENT['privacy-policy'] },
  },
  {
    path: 'terms-and-conditions',
    component: LegalPageComponent,
    data: { legalKey: 'terms', ...ROUTE_SEO_CONTENT['terms-and-conditions'] },
  },
  {
    path: 'return-and-exchange-policy',
    component: LegalPageComponent,
    data: { legalKey: 'returnExchange', ...ROUTE_SEO_CONTENT['return-and-exchange-policy'] },
  },
  {
    path: 'shipping-policy',
    component: LegalPageComponent,
    data: { legalKey: 'shipping', ...ROUTE_SEO_CONTENT['shipping-policy'] },
  },
  {
    path: 'payment-policy',
    component: LegalPageComponent,
    data: { legalKey: 'payment', ...ROUTE_SEO_CONTENT['payment-policy'] },
  },
  { path: 'privacy-terms', redirectTo: 'legal', pathMatch: 'full' },
  {
    path: 'safety',
    component: SafetyComponent,
    data: ROUTE_SEO_CONTENT.safety,
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login-page.component').then((m) => m.LoginPageComponent),
  },
  { path: 'auth/reset', component: AuthResetCallbackComponent },
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
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      ...ROUTE_SEO_CONTENT['patient/dashboard'],
    },
  },
  {
    path: 'patient/account',
    component: PatientAccountShellComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      ...ROUTE_SEO_CONTENT['patient/account'],
    },
    children: [
      { path: '', component: PatientAccountHubComponent },
      {
        path: 'profile',
        component: PatientAccountProfilePage,
        data: ROUTE_SEO_CONTENT['patient/account/profile'],
      },
      {
        path: 'addresses',
        component: PatientAccountAddressesPageComponent,
        data: ROUTE_SEO_CONTENT['patient/account/addresses'],
      },
      {
        path: 'refer',
        component: PatientAccountReferPageComponent,
        data: ROUTE_SEO_CONTENT['patient/account/refer'],
      },
      {
        path: 'rewards',
        component: PatientAccountRewardsPageComponent,
        data: ROUTE_SEO_CONTENT['patient/account/rewards'],
      },
      {
        path: 'consultations',
        component: PatientAccountConsultationsPageComponent,
        data: ROUTE_SEO_CONTENT['patient/account/consultations'],
      },
      {
        path: 'consultations/:id',
        component: PatientAccountConsultationDetailPageComponent,
        data: ROUTE_SEO_CONTENT['patient/account/consultations'],
      },
      {
        path: 'orders',
        component: PatientAccountOrdersPageComponent,
        data: ROUTE_SEO_CONTENT['patient/account/orders'],
      },
      {
        path: 'orders/:id',
        component: PatientAccountOrderDetailPageComponent,
        data: ROUTE_SEO_CONTENT['patient/account/orders'],
      },
      {
        path: 'lab-results',
        component: PatientAccountLabResultsPageComponent,
        data: ROUTE_SEO_CONTENT['patient/account/lab-results'],
      },
      {
        path: 'card',
        component: PatientAccountCardPageComponent,
        data: ROUTE_SEO_CONTENT['patient/account/card'],
      },
      {
        path: 'permissions',
        component: PatientAccountPermissionsPageComponent,
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
    component: HomeComponent,
    data: ROUTE_SEO_CONTENT.home,
  },
  {
    path: '**',
    component: NotFoundPageComponent,
    data: {
      seoTitle: 'Page not found | HopeHub Care',
      seoDescription: 'The page you requested could not be found.',
    },
  },
];
