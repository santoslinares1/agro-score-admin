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

      return throwError(() => error);
    }),
  );
};
