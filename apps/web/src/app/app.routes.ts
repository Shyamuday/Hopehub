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
  {
    path: 'about',
    component: AboutComponent,
    data: {
      seoTitle: 'About Vitalis Clinic | Doctor-Led Digital Care',
      seoDescription:
        'Learn about Vitalis Clinic, our doctor-led approach, and our mission to deliver trusted, guided digital healthcare.'
    }
  },
  {
    path: 'treatments',
    component: TreatmentsComponent,
    data: {
      seoTitle: 'Treatments | Vitalis Clinic',
      seoDescription:
        'Explore treatment pathways at Vitalis Clinic for chronic, recurring, and long-running health concerns.'
    }
  },
  {
    path: 'treatments/:slug',
    component: DiseaseDetailComponent,
    data: {
      seoTitle: 'Treatment Details | Vitalis Clinic',
      seoDescription:
        'Read treatment details, common symptoms, care approach, and safety guidance at Vitalis Clinic.'
    }
  },
  { path: 'hair-fall', redirectTo: 'treatments/hair-fall', pathMatch: 'full' },
  { path: 'skin-care', redirectTo: 'treatments/skin-care', pathMatch: 'full' },
  {
    path: 'chronic-care',
    component: ChronicCareComponent,
    data: {
      seoTitle: 'Chronic Care | Vitalis Clinic',
      seoDescription:
        'Structured chronic care at Vitalis Clinic focused on long-running symptoms, follow-up, and clinical continuity.'
    }
  },
  {
    path: 'faq',
    component: FaqComponent,
    data: {
      seoTitle: 'FAQ | Vitalis Clinic',
      seoDescription: 'Frequently asked questions about consultations, treatment flow, and patient support at Vitalis Clinic.'
    }
  },
  {
    path: 'why-successful',
    component: WhySuccessfulComponent,
    data: {
      seoTitle: 'Why Vitalis Works | Vitalis Clinic',
      seoDescription:
        'See how Vitalis Clinic combines structured case-taking, method-led decision making, and disciplined follow-up.'
    }
  },
  {
    path: 'contact',
    component: ContactComponent,
    data: {
      seoTitle: 'Contact | Vitalis Clinic',
      seoDescription: 'Contact Vitalis Clinic for consultation help, guidance, and patient support.'
    }
  },
  {
    path: 'privacy-terms',
    component: PrivacyTermsComponent,
    data: {
      seoTitle: 'Privacy and Terms | Vitalis Clinic',
      seoDescription:
        'Read the Vitalis Clinic privacy policy and terms for consultations, data use, and platform usage.'
    }
  },
  {
    path: 'safety',
    component: SafetyComponent,
    data: {
      seoTitle: 'Safety and Trust | Vitalis Clinic',
      seoDescription:
        'Review safety guidance, medical disclaimers, and emergency-care boundaries for Vitalis Clinic consultations.'
    }
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      seoTitle: 'Vitalis Clinic | Doctor-Led Digital Care',
      seoDescription:
        'Book online consultation with Vitalis Clinic through a guided intake, secure payment, and doctor-led follow-up.'
    }
  },
  {
    path: 'patient/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      seoTitle: 'Patient Dashboard | Vitalis Clinic',
      seoDescription: 'Manage your consultations, messages, and prescriptions in the Vitalis Clinic patient dashboard.'
    }
  },
  {
    path: 'doctor/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['DOCTOR'],
      seoTitle: 'Doctor Dashboard | Vitalis Clinic',
      seoDescription: 'Review assigned consultations, patient chats, and prescriptions in the Vitalis Clinic doctor dashboard.'
    }
  },
  {
    path: 'admin/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMIN'],
      seoTitle: 'Admin Dashboard | Vitalis Clinic',
      seoDescription: 'Manage clinic operations, doctor assignment, and reporting in the Vitalis Clinic admin dashboard.'
    }
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
