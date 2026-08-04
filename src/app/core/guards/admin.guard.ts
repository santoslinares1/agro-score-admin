import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';

/**
 * Guard único para todas las rutas protegidas del panel: exige sesión
 * (token presente + /auth/me válido) Y rol owner/admin. Sin sesión -> /login.
 * Con sesión pero rol 'user' -> /access-denied (no /login: sí está
 * autenticado, solo no autorizado para este panel).
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.currentUser) {
    if (authService.isAdmin()) {
      return true;
    }

    router.navigate(['/access-denied']);
    return false;
  }

  return authService.restoreSession().pipe(
    map((user) => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }

      if (authService.isAdmin(user)) {
        return true;
      }

      router.navigate(['/access-denied']);
      return false;
    }),
  );
};
