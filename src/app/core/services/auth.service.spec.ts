import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environment/environment';
import { AdminUser } from '../models/user.model';
import { AuthService, TOKEN_KEY } from './auth.service';

const buildUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: 'user-1',
  email: 'admin@example.com',
  fullName: 'Admin de prueba',
  role: 'owner',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(TOKEN_KEY);

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(TOKEN_KEY);
  });

  describe('login', () => {
    it('guarda el token y actualiza currentUser', () => {
      const user = buildUser();

      service.login({ email: user.email, password: 'secret123' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush({ user, accessToken: 'new-token' });

      expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
      expect(service.currentUser).toEqual(user);
    });
  });

  // SEC-003: el backend ahora requiere JWT válido en /auth/logout e invalida TODOS los JWT
  // emitidos antes para el usuario (ver docs/admin-backend.md en agro-score-api). Mismo
  // AuthService (casi idéntico) que agro-score-web — mismos tests, mismo criterio.
  describe('logout', () => {
    it('dispara POST /auth/logout y limpia token/currentUser de inmediato, sin esperar la respuesta', () => {
      localStorage.setItem(TOKEN_KEY, 'existing-token');

      service.logout();

      // La sesión local ya está limpia ANTES de resolver la request — no bloquea la salida
      // visual del usuario si el backend tarda o está caído.
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(service.currentUser).toBeNull();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    // SEC-003: el borrado de localStorage nunca es prueba de revocación server-side — si la
    // request falla (401/500/red caída), la sesión local se limpia igual.
    it('si la request falla con 401, la sesión local se limpia igual', () => {
      localStorage.setItem(TOKEN_KEY, 'existing-token');

      service.logout();

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(service.currentUser).toBeNull();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      req.flush('error', { status: 401, statusText: 'Unauthorized' });
    });

    it('si la request falla con 500, la sesión local se limpia igual', () => {
      localStorage.setItem(TOKEN_KEY, 'existing-token');

      service.logout();

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(service.currentUser).toBeNull();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      req.flush('error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('un error de red (sin respuesta del servidor) tampoco impide limpiar la sesión local', () => {
      localStorage.setItem(TOKEN_KEY, 'existing-token');

      service.logout();

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      req.error(new ProgressEvent('error'));
    });

    it('no guarda ningún token/usuario desde la respuesta de logout, aunque el body traiga algo parecido a una sesión', () => {
      localStorage.setItem(TOKEN_KEY, 'existing-token');

      service.logout();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      req.flush({ user: buildUser(), accessToken: 'deberia-ser-ignorado' });

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(service.currentUser).toBeNull();
    });

    // SEC-003: "cada acción de usuario produce como máximo una request" — un doble click (dos
    // llamadas sincrónicas a logout() antes de que la primera resuelva) no debe disparar una
    // segunda request a /auth/logout.
    it('dos llamadas sincrónicas (doble click) disparan como máximo una request', () => {
      localStorage.setItem(TOKEN_KEY, 'existing-token');

      service.logout();
      service.logout();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      req.flush({});

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('después de que la primera request completa, una nueva llamada a logout() sí dispara otra request', () => {
      localStorage.setItem(TOKEN_KEY, 'existing-token');

      service.logout();
      httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush({});

      localStorage.setItem(TOKEN_KEY, 'existing-token-2');
      service.logout();
      httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush({});

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });
});
