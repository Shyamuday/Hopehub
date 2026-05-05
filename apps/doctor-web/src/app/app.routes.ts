import { Routes } from '@angular/router';
import { doctorAuthGuard } from './core/guards/doctor-auth-guard';
import { Login } from './features/auth/login/login';
import { AppointmentsPage } from './features/appointments/appointments-page/appointments-page';
import { DashboardHome } from './features/dashboard/dashboard-home/dashboard-home';
import { PatientsPage } from './features/patients/patients-page/patients-page';
import { ProfilePage } from './features/profile/profile-page/profile-page';
import { DoctorShell } from './layout/doctor-shell/doctor-shell';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: DoctorShell,
    canActivate: [doctorAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardHome },
      { path: 'appointments', component: AppointmentsPage },
      { path: 'patients', component: PatientsPage },
      { path: 'profile', component: ProfilePage }
    ]
  },
  { path: '**', redirectTo: '' }
];
