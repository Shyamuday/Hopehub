import { Routes } from '@angular/router';
import { authGuard, capabilityGuard } from './core/guards/auth.guard';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';

export const routes: Routes = [
  {
    path: ROUTE_PATHS.LOGIN,
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/home-redirect/home-redirect.component').then((m) => m.HomeRedirectComponent)
      },
      {
        path: ROUTE_PATHS.ORDERS,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/orders/orders.component').then((m) => m.OrdersComponent)
      },
      {
        path: ROUTE_PATHS.WAREHOUSE,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/warehouse-dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: ROUTE_PATHS.WAREHOUSE_TRANSFERS,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/warehouse-transfers/transfers.component').then((m) => m.TransfersComponent)
      },
      {
        path: ROUTE_PATHS.DELIVERIES,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/deliveries/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: ROUTE_PATHS.DELIVERY_ORDERS,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/delivery-orders/orders.component').then((m) => m.OrdersComponent)
      },
      {
        path: ROUTE_PATHS.LAB_REFERRALS,
        canActivate: [capabilityGuard],
        loadComponent: () =>
          import('./pages/lab-referrals/referrals.component').then((m) => m.ReferralsComponent)
      },
      {
        path: ROUTE_PATHS.ACCOUNTS,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/accounts/accounts.component').then((m) => m.AccountsComponent)
      },
      {
        path: ROUTE_PATHS.CLAIMS,
        canActivate: [capabilityGuard],
        loadComponent: () => import('./pages/claims/claims.component').then((m) => m.ClaimsComponent)
      }
    ]
  },
  { path: '**', redirectTo: ROUTE_PATHS.CLAIMS }
];
