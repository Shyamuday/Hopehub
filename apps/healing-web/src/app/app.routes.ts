import { Routes } from '@angular/router';
import { NavigationGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'Home - Hope Hub',
    data: {
      breadcrumb: 'Home',
      description: 'Professional mental health services and community support',
      keywords: 'mental health, counseling, therapy, hope hub',
    },
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./features/services/services.component').then((m) => m.ServicesComponent),
    title: 'Services - Hope Hub',
    data: {
      breadcrumb: 'Services',
      description: 'Comprehensive mental health services including counseling and therapy',
      keywords:
        'mental health services, counseling, therapy, breakup counseling, career counseling',
    },
  },
  {
    path: 'services/:id',
    loadComponent: () =>
      import('./features/services/service-detail.component').then((m) => m.ServiceDetailComponent),
    title: 'Service Details - Hope Hub',
    canActivate: [NavigationGuard],
    data: {
      breadcrumb: 'Service Details',
      description: 'Detailed information about our mental health services',
      keywords: 'service details, mental health, counseling, therapy',
    },
  },
  {
    path: 'community',
    loadComponent: () =>
      import('./features/community/community.component').then((m) => m.CommunityComponent),
    title: 'Community - Hope Hub',
    data: {
      breadcrumb: 'Community',
      description: 'Join our supportive community and monthly meetups',
      keywords: 'community, support group, meetups, telegram, mental health community',
    },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact.component').then((m) => m.ContactComponent),
    title: 'Contact - Hope Hub',
    data: {
      breadcrumb: 'Contact',
      description: 'Get in touch with our mental health professionals',
      keywords: 'contact, mental health, counseling, therapy, consultation',
    },
  },
  {
    path: 'exercises',
    loadComponent: () =>
      import('./shared/components/exercises/exercises.component').then((m) => m.ExercisesComponent),
    title: 'Mental Health Exercises - Hope Hub',
    data: {
      breadcrumb: 'Exercises',
      description:
        'Evidence-based mental health exercises for anxiety, depression, stress and well-being',
      keywords:
        'mental health exercises, breathing, mindfulness, anxiety relief, stress management',
    },
  },
  {
    path: 'assessments',
    loadComponent: () =>
      import('./shared/components/multi-assessment/multi-assessment.component').then(
        (m) => m.MultiAssessmentComponent,
      ),
    title: 'Mental Health Assessments - Hope Hub',
    data: {
      breadcrumb: 'Assessments',
      description:
        'Comprehensive mental health assessments including PHQ-9, GAD-7, and other validated tools',
      keywords: 'mental health assessment, PHQ-9, GAD-7, depression screening, anxiety assessment',
    },
  },
  {
    path: 'lifestyle-tips',
    loadComponent: () =>
      import('./shared/components/lifestyle-tips/lifestyle-tips.component').then(
        (m) => m.LifestyleTipsComponent,
      ),
    title: 'Lifestyle Tips for Mental Wellness - Hope Hub',
    data: {
      breadcrumb: 'Lifestyle Tips',
      description:
        'Evidence-based lifestyle tips for improving mental health, sleep, nutrition, and well-being',
      keywords:
        'lifestyle tips, mental wellness, sleep hygiene, nutrition, stress management, work-life balance',
    },
  },
  {
    path: 'articles',
    loadComponent: () =>
      import('./shared/components/articles/articles.component').then((m) => m.ArticlesComponent),
    title: 'Mental Health Articles & Resources - Hope Hub',
    data: {
      breadcrumb: 'Articles',
      description:
        'Evidence-based articles and resources for understanding and improving mental health',
      keywords:
        'mental health articles, depression, anxiety, stress, self-care, psychology resources',
    },
  },
  {
    path: 'donate',
    loadComponent: () =>
      import('./features/donate/donate.component').then((m) => m.DonateComponent),
    title: 'Support Us - Hope Hub',
    data: {
      breadcrumb: 'Donate',
      description: 'Support Hope Hub and help keep mental health resources free for everyone',
      keywords: 'donate, support, UPI, mental health, hope hub',
    },
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'My Consultations - Hope Hub',
    data: {
      breadcrumb: 'My Consultations',
      description: 'View Hope Hub bookings and join voice or video consultation calls',
      keywords: 'hope hub dashboard, consultation call, video call, voice call',
    },
  },
  {
    path: '404',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page Not Found - Hope Hub',
    data: {
      breadcrumb: 'Not Found',
      description: 'The page you are looking for could not be found',
      keywords: 'not found, error, page not found',
    },
  },
  {
    path: '**',
    redirectTo: '/404',
    pathMatch: 'full',
  },
];
