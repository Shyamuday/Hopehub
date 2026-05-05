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
import { HomeComponent } from './home.component';

export const routes: Routes = [
  {
    path: 'about',
    component: AboutComponent,
    data: {
      seoTitle: 'About Vitalis Care and Research Centre | Doctor-Led Digital Care',
      seoDescription:
        'Learn about Vitalis Care and Research Centre, our doctor-led approach, and our mission to deliver trusted, guided digital healthcare.'
    }
  },
  {
    path: 'treatments',
    component: TreatmentsComponent,
    data: {
      seoTitle: 'Treatments | Vitalis Care and Research Centre',
      seoDescription:
        'Explore treatment pathways at Vitalis Care and Research Centre for chronic, recurring, and long-running health concerns.'
    }
  },
  {
    path: 'treatments/:slug',
    component: DiseaseDetailComponent,
    data: {
      seoTitle: 'Treatment Details | Vitalis Care',
      seoDescription:
        'Read treatment details, common symptoms, care approach, and safety guidance at Vitalis Care.'
    }
  },
  { path: 'hair-fall', redirectTo: 'treatments/hair-fall', pathMatch: 'full' },
  { path: 'skin-care', redirectTo: 'treatments/skin-care', pathMatch: 'full' },
  {
    path: 'chronic-care',
    component: ChronicCareComponent,
    data: {
      seoTitle: 'Chronic Care | Vitalis Care',
      seoDescription:
        'Structured chronic care at Vitalis Care focused on long-running symptoms, follow-up, and clinical continuity.'
    }
  },
  {
    path: 'faq',
    component: FaqComponent,
    data: {
      seoTitle: 'FAQ | Vitalis Care',
      seoDescription: 'Frequently asked questions about consultations, treatment flow, and patient support at Vitalis Care.'
    }
  },
  {
    path: 'why-successful',
    component: WhySuccessfulComponent,
    data: {
      seoTitle: 'Why Vitalis Works | Vitalis Care',
      seoDescription:
        'See how Vitalis Care combines structured case-taking, method-led decision making, and disciplined follow-up.'
    }
  },
  {
    path: 'contact',
    component: ContactComponent,
    data: {
      seoTitle: 'Contact | Vitalis Care',
      seoDescription: 'Contact Vitalis Care for consultation help, guidance, and patient support.'
    }
  },
  {
    path: 'privacy-terms',
    component: PrivacyTermsComponent,
    data: {
      seoTitle: 'Privacy and Terms | Vitalis Care',
      seoDescription:
        'Read the Vitalis Care privacy policy and terms for consultations, data use, and platform usage.'
    }
  },
  {
    path: 'safety',
    component: SafetyComponent,
    data: {
      seoTitle: 'Safety and Trust | Vitalis Care',
      seoDescription:
        'Review safety guidance, medical disclaimers, and emergency-care boundaries for Vitalis Care consultations.'
    }
  },
  { path: 'login', redirectTo: '', pathMatch: 'full' },
  {
    path: 'patient/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['PATIENT'],
      seoTitle: 'Patient Dashboard | Vitalis Care',
      seoDescription: 'Manage your consultations, messages, and prescriptions in the Vitalis Care patient dashboard.'
    }
  },
  {
    path: 'doctor/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['DOCTOR'],
      seoTitle: 'Doctor Dashboard | Vitalis Care',
      seoDescription: 'Review assigned consultations, patient chats, and prescriptions in the Vitalis Care doctor dashboard.'
    }
  },
  {
    path: 'admin/dashboard',
    component: DashboardComponent,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMIN'],
      seoTitle: 'Admin Dashboard | Vitalis Care',
      seoDescription: 'Manage clinic operations, doctor assignment, and reporting in the Vitalis Care admin dashboard.'
    }
  },
  {
    path: '',
    component: HomeComponent,
    data: {
      seoTitle: 'Vitalis Care | Doctor-Led Digital Care',
      seoDescription:
        'Vitalis Care offers guided, doctor-led digital consultations with secure intake, follow-up, and patient support.'
    }
  },
  { path: '**', redirectTo: '' }
];
