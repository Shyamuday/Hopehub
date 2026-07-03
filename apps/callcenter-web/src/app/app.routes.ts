import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { DEFAULT_AUTHED_ROUTE, ROUTE_PATHS } from './core/constants/app-routes.constants';

export const routes: Routes = [
  {
    path: ROUTE_PATHS.LOGIN,
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: DEFAULT_AUTHED_ROUTE },
      {
        path: ROUTE_PATHS.QUEUE,
        loadComponent: () => import('./pages/queue/queue.component').then(m => m.QueueComponent)
      },
      {
        path: ROUTE_PATHS.WALK_IN,
        loadComponent: () => import('./pages/walk-in/walk-in.component').then(m => m.WalkInComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
