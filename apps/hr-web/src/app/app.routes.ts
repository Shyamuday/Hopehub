import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'employees',
        loadComponent: () => import('./pages/employees/employees.component').then(m => m.EmployeesComponent)
      },
      {
        path: 'doctors',
        loadComponent: () => import('./pages/doctors/doctors.component').then(m => m.DoctorsComponent)
      },
      {
        path: 'store-staff',
        loadComponent: () => import('./pages/store-staff/store-staff.component').then(m => m.StoreStaffComponent)
      },
      {
        path: 'leaves',
        loadComponent: () => import('./pages/leaves/leaves.component').then(m => m.LeavesComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
