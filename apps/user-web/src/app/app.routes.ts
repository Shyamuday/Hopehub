import { Routes } from '@angular/router';
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
  {
    path: 'our-doctors',
    component: OurDoctorsComponent,
    data: {
      seoTitle: 'Our Doctors | Vitalis Care and Research Centre',
      seoDescription:
        'Meet the qualified homeopathic doctors at Vitalis Care. Our internal clinical team is matched to patients based on their condition for personalised, long-term care.'
    }
  },
  {
    path: 'blog',
    component: BlogComponent,
    data: {
      seoTitle: 'Health Blog | Vitalis Care and Research Centre',
      seoDescription:
        'Evidence-informed articles on chronic care, homeopathy, hair and skin health, mental wellness, and healthy living from the Vitalis Care clinical team.'
    }
  },
  {
    path: 'testimonials',
    component: TestimonialsComponent,
    data: {
      seoTitle: 'Patient Stories | Vitalis Care and Research Centre',
      seoDescription:
        'Read real patient experiences from Vitalis Care. Patients with chronic conditions share how doctor-led homeopathic care helped them find lasting relief.'
    }
  },
  {
    path: 'careers',
    component: CareersComponent,
    data: {
      seoTitle: 'Careers | Vitalis Care and Research Centre',
      seoDescription:
        'Join the Vitalis Care team. We are hiring homeopathic doctors, care coordinators, pharmacists, and operations staff who are passionate about patient-first healthcare.'
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
  { path: 'auth/reset', component: AuthResetCallbackComponent },
  {
    path: 'get-app',
    loadComponent: () => import('./get-app-page.component').then((m) => m.GetAppPageComponent),
    data: {
      seoTitle: 'Download Vitalis Patient App',
      seoDescription: 'Scan the QR code to install the Vitalis patient app. No account required to download.'
    }
  },
  {
    path: 'patient/scan',
    loadComponent: () => import('./user-patient-scan-page').then((m) => m.UserPatientScanPage),
    canActivate: [roleGuard],
    data: { roles: ['PATIENT'], seoTitle: 'Scan patient ID | Vitalis Care' }
  },
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
