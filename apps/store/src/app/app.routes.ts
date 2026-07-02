import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
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

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'search', component: SearchComponent },
      { path: 'medicines/:id', component: MedicineDetailComponent },
      { path: 'stock-in', component: StockInComponent },
      { path: 'stock-out', component: StockOutComponent },
      { path: 'alerts', component: AlertsComponent },
      { path: 'rack-map', component: RackMapComponent },
      { path: 'medicines', component: MedicinesAdminComponent },
      { path: 'movements', component: MovementsComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
