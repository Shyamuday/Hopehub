import { Routes } from '@angular/router';
import { DEFAULT_AUTHED_ROUTE, ROUTE_PATHS } from './core/constants/app-routes.constants';
import { doctorAuthGuard } from './core/guards/doctor-auth-guard';
import { Login } from './features/auth/login/login';
import { AppointmentsPage } from './features/appointments/appointments-page/appointments-page';
import { DashboardHome } from './features/dashboard/dashboard-home/dashboard-home';
import { PatientsPage } from './features/patients/patients-page/patients-page';
import { ProfilePage } from './features/profile/profile-page/profile-page';
import { MyLeaves } from './features/leaves/my-leaves/my-leaves';
import { SlotsPage } from './features/slots/slots-page/slots-page';
import { EarningsPage } from './features/earnings/earnings-page/earnings-page';
import { PatientScanPage } from './features/scan/patient-scan-page/patient-scan-page';
import { DoctorShell } from './layout/doctor-shell/doctor-shell';

export const routes: Routes = [
  { path: ROUTE_PATHS.LOGIN, component: Login },
  {
    path: '',
    component: DoctorShell,
    canActivate: [doctorAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: DEFAULT_AUTHED_ROUTE },
      { path: ROUTE_PATHS.DASHBOARD, component: DashboardHome },
      { path: ROUTE_PATHS.APPOINTMENTS, component: AppointmentsPage },
      { path: ROUTE_PATHS.PATIENTS, component: PatientsPage },
      { path: ROUTE_PATHS.PROFILE, component: ProfilePage },
      { path: ROUTE_PATHS.LEAVES, component: MyLeaves },
      { path: ROUTE_PATHS.SLOTS, component: SlotsPage },
      { path: ROUTE_PATHS.EARNINGS, component: EarningsPage },
      { path: 'scan/patient/:patientCode', component: PatientScanPage }
    ]
  },
  { path: '**', redirectTo: '' }
];
