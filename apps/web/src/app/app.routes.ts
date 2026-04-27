import { Routes } from '@angular/router';
import { AboutComponent } from './about.component';
import { DashboardComponent } from './dashboard.component';
import {
  ChronicCareComponent,
  ContactComponent,
  DiseaseDetailComponent,
  FaqComponent,
  PrivacyTermsComponent,
  SafetyComponent,
  TreatmentsComponent,
  WhySuccessfulComponent
} from './public-pages.component';
import { roleGuard } from './role.guard';
import { LoginComponent } from './auth/login.component';

export const routes: Routes = [
  { path: 'about', component: AboutComponent },
  { path: 'treatments', component: TreatmentsComponent },
  { path: 'treatments/:slug', component: DiseaseDetailComponent },
  { path: 'hair-fall', redirectTo: 'treatments/hair-fall', pathMatch: 'full' },
  { path: 'skin-care', redirectTo: 'treatments/skin-care', pathMatch: 'full' },
  { path: 'chronic-care', component: ChronicCareComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'why-successful', component: WhySuccessfulComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'privacy-terms', component: PrivacyTermsComponent },
  { path: 'safety', component: SafetyComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'patient/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: { roles: ['PATIENT'] }
  },
  {
    path: 'doctor/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: { roles: ['DOCTOR'] }
  },
  {
    path: 'admin/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] }
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
