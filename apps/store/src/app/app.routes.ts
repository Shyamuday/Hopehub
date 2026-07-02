import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { DEFAULT_AUTHED_ROUTE, ROUTE_PATHS } from './core/constants/app-routes.constants';
import { LoginComponent } from './pages/login/login.component';
import { ShellComponent } from './layout/shell/shell.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SearchComponent } from './pages/search/search.component';
import { MedicineDetailComponent } from './pages/medicine-detail/medicine-detail.component';
import { StockInComponent } from './pages/stock-in/stock-in.component';
import { StockOutComponent } from './pages/stock-out/stock-out.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { RackMapComponent } from './pages/rack-map/rack-map.component';
import { MedicinesAdminComponent } from './pages/medicines-admin/medicines-admin.component';
import { MovementsComponent } from './pages/movements/movements.component';
import { StaffActivityComponent } from './pages/staff-activity/staff-activity.component';
import { StaffHrComponent } from './pages/staff-hr/staff-hr.component';
import { MyPayPage } from './pages/my-pay/my-pay-page';
import { StoreExpensesPage } from './pages/store-expenses/store-expenses-page';
import { PatientScanComponent } from './pages/patient-scan/patient-scan.component';
import { PatientsPage } from './pages/patients/patients-page';

export const routes: Routes = [
  { path: ROUTE_PATHS.LOGIN, component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: DEFAULT_AUTHED_ROUTE },
      { path: ROUTE_PATHS.DASHBOARD, component: DashboardComponent },
      { path: ROUTE_PATHS.SEARCH, component: SearchComponent },
      { path: ROUTE_PATHS.PATIENTS, component: PatientsPage },
      { path: ROUTE_PATHS.MEDICINE_DETAIL, component: MedicineDetailComponent },
      { path: ROUTE_PATHS.STOCK_IN, component: StockInComponent },
      { path: ROUTE_PATHS.STOCK_OUT, component: StockOutComponent },
      { path: ROUTE_PATHS.ALERTS, component: AlertsComponent },
      { path: ROUTE_PATHS.RACK_MAP, component: RackMapComponent },
      { path: ROUTE_PATHS.MEDICINES, component: MedicinesAdminComponent },
      { path: ROUTE_PATHS.MOVEMENTS, component: MovementsComponent },
      { path: ROUTE_PATHS.STAFF_ACTIVITY, component: StaffActivityComponent },
      { path: ROUTE_PATHS.STAFF_HR, component: StaffHrComponent },
      { path: ROUTE_PATHS.MY_PAY, component: MyPayPage },
      { path: ROUTE_PATHS.STORE_EXPENSES, component: StoreExpensesPage },
      { path: ROUTE_PATHS.PATIENT_SCAN, component: PatientScanComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
