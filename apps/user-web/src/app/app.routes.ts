import { Routes } from '@angular/router';
import { ROUTE_SEO_CONTENT } from './core/constants/public-site-content.constants';
import { AboutComponent } from './about.component';
import { BlogComponent } from './blog.component';
import { CareersComponent } from './careers.component';
import { DashboardComponent } from './dashboard.component';
import { ChronicCareComponent } from './chronic-care.component';
import { ContactComponent } from './contact.component';
import { DiseaseDetailComponent } from './disease-detail.component';
import { FaqComponent } from './faq.component';
import { OurDoctorsComponent } from './our-doctors.component';
import { PrivacyTermsComponent } from './privacy-terms.component';
import { SafetyComponent } from './safety.component';
import { TestimonialsComponent } from './testimonials.component';
import { TreatmentsComponent } from './treatments.component';
import { WhySuccessfulComponent } from './why-successful.component';
import { roleGuard } from './role.guard';
import { HomeComponent } from './home.component';
import { AuthResetCallbackComponent } from './auth/auth-reset-callback.component';

export const routes: Routes = [
  {
    path: 'about',
    component: AboutComponent,
    data: ROUTE_SEO_CONTENT.about
  },
  {
    path: 'treatments',
    component: TreatmentsComponent,
    data: ROUTE_SEO_CONTENT.treatments
  },
  {
    path: 'treatments/:slug',
    component: DiseaseDetailComponent,
    data: ROUTE_SEO_CONTENT['treatments/:slug']
  },
  {
    path: 'our-doctors',
    component: OurDoctorsComponent,
    data: ROUTE_SEO_CONTENT['our-doctors']
  },
  {
    path: 'blog',
    component: BlogComponent,
    data: ROUTE_SEO_CONTENT.blog
  },
  {
    path: 'testimonials',
    component: TestimonialsComponent,
    data: ROUTE_SEO_CONTENT.testimonials
  },
  {
    path: 'careers',
    component: CareersComponent,
    data: ROUTE_SEO_CONTENT.careers
  },
  { path: 'hair-fall', redirectTo: 'treatments/hair-fall', pathMatch: 'full' },
  { path: 'skin-care', redirectTo: 'treatments/skin-care', pathMatch: 'full' },
  {
    path: 'chronic-care',
    component: ChronicCareComponent,
    data: ROUTE_SEO_CONTENT['chronic-care']
  },
  {
    path: 'faq',
    component: FaqComponent,
    data: ROUTE_SEO_CONTENT.faq
  },
  {
    path: 'why-successful',
    component: WhySuccessfulComponent,
    data: ROUTE_SEO_CONTENT['why-successful']
  },
  {
    path: 'contact',
    component: ContactComponent,
    data: ROUTE_SEO_CONTENT.contact
  },
  {
    path: 'privacy-terms',
    component: PrivacyTermsComponent,
    data: ROUTE_SEO_CONTENT['privacy-terms']
  },
  {
    path: 'safety',
    component: SafetyComponent,
    data: ROUTE_SEO_CONTENT.safety
  },
  { path: 'login', redirectTo: '', pathMatch: 'full' },
  { path: 'auth/reset', component: AuthResetCallbackComponent },
  {
    path: 'get-app',
    loadComponent: () => import('./get-app-page.component').then((m) => m.GetAppPageComponent),
    data: ROUTE_SEO_CONTENT['get-app']
  },
  {
    path: 'patient/scan',
    loadComponent: () => import('./user-patient-scan-page').then((m) => m.UserPatientScanPage),
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      ...ROUTE_SEO_CONTENT['patient/dashboard'],
      seoTitle: 'Scan patient ID | Vitalis Care'
    }
  },
  {
    path: 'patient/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      ...ROUTE_SEO_CONTENT['patient/dashboard']
    }
  },
  {
    path: 'doctor/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['DOCTOR'],
      ...ROUTE_SEO_CONTENT['doctor/dashboard']
    }
  },
  {
    path: 'admin/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMIN'],
      ...ROUTE_SEO_CONTENT['admin/dashboard']
    }
  },
  {
    path: '',
    component: HomeComponent,
    data: ROUTE_SEO_CONTENT.home
  },
  { path: '**', redirectTo: '' }
];
