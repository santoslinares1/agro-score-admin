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
      // Admin PR 6: vista de detalle de campo — ruta hermana de 'fields' (no anidada como hijo:
      // sigue el mismo patrón "leaf route" que el resto de este router, no hay <router-outlet>
      // dentro de FieldsComponent). Debe ir DESPUÉS de 'fields' en la lista para que quede claro
      // que es más específica, aunque Angular no lo requiera (segmentos distintos, sin ambigüedad).
      {
        path: 'fields/:fieldId',
        loadComponent: () =>
          import('./features/fields/field-detail/field-detail.component').then(
            (m) => m.FieldDetailComponent,
          ),
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
        path: 'scheduled-analysis',
        loadComponent: () =>
          import('./features/scheduled-analysis/scheduled-analysis.component').then(
            (m) => m.ScheduledAnalysisComponent,
          ),
      },
      {
        path: 'access-requests',
        loadComponent: () =>
          import('./features/access-requests/access-requests.component').then(
            (m) => m.AccessRequestsComponent,
          ),
      },
      {
        path: 'audit-logs',
        loadComponent: () =>
          import('./features/audit-logs/audit-logs.component').then(
            (m) => m.AuditLogsComponent,
          ),
      },
      {
        path: 'system',
        loadComponent: () =>
          import('./features/system/system.component').then((m) => m.SystemComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
