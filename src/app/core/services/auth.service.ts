import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, shareReplay, tap } from 'rxjs';

import { environment } from '../../../environment/environment';
import { AuthResponse, LoginPayload } from '../models/auth.model';
import { AdminUser } from '../models/user.model';

export const TOKEN_KEY = 'agroscore_admin_access_token';

const ADMIN_ROLES = ['owner', 'admin'] as const;

/**
 * El backend (agro-score-api) autentica con Bearer JWT en el header
 * Authorization, guardado acá en localStorage y adjuntado por
 * authInterceptor — no usa cookies httpOnly (no hay ningún `res.cookie(...)`
 * en el backend; JwtStrategy lee el token con
 * ExtractJwt.fromAuthHeaderAsBearerToken()). `withCredentials: true` se
 * agrega igual en el interceptor por si el backend suma cookies a futuro:
 * es inofensivo hoy (CORS ya está configurado con orígenes explícitos, no
 * '*', así que withCredentials no rompe nada) pero no reemplaza este
 * mecanismo de token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly currentUserSubject = new BehaviorSubject<AdminUser | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private restoreSession$: Observable<AdminUser | null> | null = null;

  get currentUser(): AdminUser | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  isAdmin(user: AdminUser | null = this.currentUser): boolean {
    return !!user && (ADMIN_ROLES as readonly string[]).includes(user.role);
  }

  // Mismo patrón que agro-score-web (AUTH-FIX-1): no se dispara desde el
  // constructor para evitar un ciclo de dependencias con el interceptor;
  // authGuard la dispara después de que AuthService ya terminó de construirse.
  restoreSession(): Observable<AdminUser | null> {
    if (!this.getToken()) {
      this.currentUserSubject.next(null);
      return of(null);
    }

    if (!this.restoreSession$) {
      this.restoreSession$ = this.me().pipe(
        catchError(() => of(null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.restoreSession$;
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, payload)
      .pipe(tap((response) => this.storeSession(response)));
  }

  me(): Observable<AdminUser> {
    return this.http
      .get<AdminUser>(`${this.apiUrl}/auth/me`)
      .pipe(tap((user) => this.currentUserSubject.next(user)));
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      error: () => undefined,
    });

    this.clearSession();
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.restoreSession$ = null;
  }

  private storeSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    this.currentUserSubject.next(response.user);
  }
}
