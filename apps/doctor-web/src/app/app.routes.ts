import { Routes } from '@angular/router';
import { doctorAuthGuard } from './core/guards/doctor-auth-guard';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { Login } from './features/auth/login/login';
import { DoctorShell } from './layout/doctor-shell/doctor-shell';
import { WorklistPage } from './features/worklist/worklist-page/worklist-page';
import { DashboardHome } from './features/dashboard/dashboard-home/dashboard-home';
import { AppointmentsPage } from './features/appointments/appointments-page/appointments-page';
import { CaseAnalysisPage } from './features/case-analysis/case-analysis-page/case-analysis-page';
import { PatientsPage } from './features/patients/patients-page/patients-page';
import { ProfilePage } from './features/profile/profile-page/profile-page';
import { MyLeaves } from './features/leaves/my-leaves/my-leaves';
import { SlotsPage } from './features/slots/slots-page/slots-page';
import { EarningsPage } from './features/earnings/earnings-page/earnings-page';
import { PatientScanPage } from './features/scan/patient-scan-page/patient-scan-page';

export const routes: Routes = [
  { path: ROUTE_PATHS.LOGIN, component: Login },
  {
    path: '',
    component: DoctorShell,
    canActivate: [doctorAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: ROUTE_PATHS.WORKLIST },
      { path: ROUTE_PATHS.WORKLIST, component: WorklistPage },
      { path: ROUTE_PATHS.DASHBOARD, component: DashboardHome },
      { path: ROUTE_PATHS.APPOINTMENTS, component: AppointmentsPage },
      { path: ROUTE_PATHS.CASE_ANALYSIS, component: CaseAnalysisPage },
      { path: ROUTE_PATHS.PATIENTS, component: PatientsPage },
      { path: ROUTE_PATHS.PROFILE, component: ProfilePage },
      { path: ROUTE_PATHS.LEAVES, component: MyLeaves },
      { path: ROUTE_PATHS.SLOTS, component: SlotsPage },
      { path: ROUTE_PATHS.EARNINGS, component: EarningsPage },
      { path: 'scan/:patientId', component: PatientScanPage }
    ]
  },
  { path: '**', redirectTo: '' }
];
