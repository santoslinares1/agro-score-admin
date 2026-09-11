import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';

import { AuthService, TOKEN_KEY } from '../services/auth.service';

/**
 * SEC-005: true solo si `url` apunta a la API de AgroScore (`environment.apiUrl`), no a cualquier
 * host que la contenga como substring — evita falsos positivos como
 * "https://api.agroscorelatam.com.evil-lookalike.test/..." (dominio distinto) o
 * "https://evil.test/https://api.agroscorelatam.com/..." (la URL real la arma evil.test).
 * Misma comparación que `agro-score-web` (`auth.interceptor.ts::isApiRequest`).
 */
export function isApiRequest(url: string, apiUrl: string = environment.apiUrl): boolean {
  const normalizedApiUrl = apiUrl.replace(/\/$/, '');
  const normalizedUrl = url.replace(/\/$/, '');

  return normalizedUrl === normalizedApiUrl || normalizedUrl.startsWith(`${normalizedApiUrl}/`);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = localStorage.getItem(TOKEN_KEY);
  // SEC-005: el JWT administrativo solo tiene sentido para la API de AgroScore — mandarlo a
  // cualquier otra URL (origen distinto, host parecido, o una URL de terceros que embeba
  // environment.apiUrl en su path/query) sería una fuga de credenciales.
  const isApi = isApiRequest(req.url);

  const authReq = req.clone({
    ...(token && isApi ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
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
