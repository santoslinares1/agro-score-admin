import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/access-denied/access-denied.component').then(
        (m) => m.AccessDeniedComponent,
      ),
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'fields',
        loadComponent: () =>
          import('./features/fields/fields.component').then((m) => m.FieldsComponent),
      },
      {
        path: 'lots',
        loadComponent: () => import('./features/lots/lots.component').then((m) => m.LotsComponent),
      },
      {
        path: 'analysis',
        loadComponent: () =>
          import('./features/analysis/analysis.component').then((m) => m.AnalysisComponent),
      },
      {
        path: 'access-requests',
        loadComponent: () =>
          import('./features/access-requests/access-requests.component').then(
            (m) => m.AccessRequestsComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
