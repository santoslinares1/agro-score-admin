import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService, TOKEN_KEY } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = localStorage.getItem(TOKEN_KEY);

  const authReq = req.clone({
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
    // Pedido explícito: el backend hoy no usa cookies, pero esto deja las
    // requests listas si en el futuro suma auth por cookie httpOnly. No
    // interfiere con el Bearer token de arriba, que es el mecanismo real.
    withCredentials: true,
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        authService.clearSession();
        router.navigate(['/login']);
      }

      // ADMIN-2: un 403 en vivo (no al navegar, sino en medio de una
      // acción) significa que el rol ya no es owner/admin — normalmente
      // adminGuard ya lo hubiera atajado al cargar la ruta, pero un rol
      // bajado mientras la sesión seguía abierta en esta pestaña puede
      // llegar acá primero. No se limpia la sesión (el token sigue siendo
      // válido, solo no autorizado) — se manda a /access-denied, igual que
      // hace el guard.
      if (error.status === 403 && router.url !== '/access-denied') {
        router.navigate(['/access-denied']);
      }

      return throwError(() => error);
    }),
  );
};
