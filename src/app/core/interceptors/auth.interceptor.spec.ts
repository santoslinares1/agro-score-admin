import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { environment } from '../../../environment/environment';
import { TOKEN_KEY } from '../services/auth.service';
import { authInterceptor, isApiRequest } from './auth.interceptor';

describe('isApiRequest', () => {
  const API_URL = 'https://api.agroscorelatam.com';

  it('la propia apiUrl (sin path) es API', () => {
    expect(isApiRequest('https://api.agroscorelatam.com', API_URL)).toBeTrue();
  });

  it('apiUrl con slash final es API', () => {
    expect(isApiRequest('https://api.agroscorelatam.com/', API_URL)).toBeTrue();
  });

  it('un path bajo apiUrl es API', () => {
    expect(isApiRequest('https://api.agroscorelatam.com/fields', API_URL)).toBeTrue();
  });

  it('un dominio distinto que contiene apiUrl como prefijo NO es API', () => {
    expect(isApiRequest('https://api.agroscorelatam.com.ar/fields', API_URL)).toBeFalse();
  });

  it('un host que continúa con otro dominio parecido NO es API', () => {
    expect(isApiRequest('https://api.agroscorelatam.com.evil-lookalike.test/fields', API_URL)).toBeFalse();
  });

  it('un subdominio distinto NO es API', () => {
    expect(isApiRequest('https://admin.api.agroscorelatam.com/fields', API_URL)).toBeFalse();
  });

  it('una URL externa que embebe apiUrl como parte del path NO es API', () => {
    expect(isApiRequest('https://evil.test/https://api.agroscorelatam.com/fields', API_URL)).toBeFalse();
  });

  it('una URL externa que incluye apiUrl en el query string NO es API', () => {
    expect(isApiRequest('https://evil.test/resource?next=https://api.agroscorelatam.com', API_URL)).toBeFalse();
  });

  it('una concatenación sin frontera "/" inmediatamente después de la base NO es API', () => {
    expect(isApiRequest('https://api.agroscorelatam.comevil.test/fields', API_URL)).toBeFalse();
  });

  it('una URL externa sin relación con apiUrl NO es API', () => {
    expect(isApiRequest('https://external.test/resource', API_URL)).toBeFalse();
  });
});

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let router: { navigate: jasmine.Spy; url: string };

  const apiRequestUrl = (path: string) => `${environment.apiUrl}${path}`;

  beforeEach(() => {
    localStorage.removeItem(TOKEN_KEY);
    router = { navigate: jasmine.createSpy('navigate'), url: '/dashboard' };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(TOKEN_KEY);
  });

  it('agrega el header Authorization en una request a la API si hay token', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');

    httpClient.get(apiRequestUrl('/test')).subscribe();

    const req = httpMock.expectOne(apiRequestUrl('/test'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-token');
    req.flush({});
  });

  it('agrega Authorization en una request a la apiUrl exacta (sin path) si hay token', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');

    httpClient.get(environment.apiUrl).subscribe();

    const req = httpMock.expectOne(environment.apiUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-token');
    req.flush({});
  });

  it('no agrega Authorization en una request a la API si no hay token', () => {
    httpClient.get(apiRequestUrl('/test')).subscribe();

    const req = httpMock.expectOne(apiRequestUrl('/test'));
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no agrega Authorization en una request a un origen externo aunque haya token', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');

    httpClient.get('https://external.test/resource').subscribe();

    const req = httpMock.expectOne('https://external.test/resource');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no agrega Authorization en una request a un host parecido pero distinto de la API', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');
    const lookalikeUrl = `${environment.apiUrl}.evil-lookalike.test/fields`;

    httpClient.get(lookalikeUrl).subscribe();

    const req = httpMock.expectOne(lookalikeUrl);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no agrega Authorization en una request a un subdominio distinto de la API', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');
    const subdomainUrl = environment.apiUrl.replace('://', '://admin.') + '/fields';

    httpClient.get(subdomainUrl).subscribe();

    const req = httpMock.expectOne(subdomainUrl);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no agrega Authorization en una URL externa que embebe apiUrl en el path', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');
    const embeddedUrl = `https://evil.test/${environment.apiUrl}/fields`;

    httpClient.get(embeddedUrl).subscribe();

    const req = httpMock.expectOne(embeddedUrl);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no agrega Authorization en una URL externa que incluye apiUrl en el query string', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');
    const queryUrl = `https://evil.test/resource?next=${environment.apiUrl}`;

    httpClient.get(queryUrl).subscribe();

    const req = httpMock.expectOne(queryUrl);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no agrega Authorization cuando se concatena texto sin "/" inmediatamente después de la base', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');
    const concatenatedUrl = `${environment.apiUrl}evil.test/fields`;

    httpClient.get(concatenatedUrl).subscribe();

    const req = httpMock.expectOne(concatenatedUrl);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no borra ni altera el token almacenado solo por enviar una request externa', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');

    httpClient.get('https://external.test/resource').subscribe();

    const req = httpMock.expectOne('https://external.test/resource');
    req.flush({});

    expect(localStorage.getItem(TOKEN_KEY)).toBe('fake-token');
  });

  it('en un 401 de la API limpia la sesión (borra el token) y redirige a /login', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');

    httpClient.get(apiRequestUrl('/test')).subscribe({ error: () => undefined });

    const req = httpMock.expectOne(apiRequestUrl('/test'));
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('en un 401 de la API sin token previo no intenta limpiar sesión ni redirigir', () => {
    httpClient.get(apiRequestUrl('/test')).subscribe({ error: () => undefined });

    const req = httpMock.expectOne(apiRequestUrl('/test'));
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un error no-401/403 de la API no limpia sesión ni redirige', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');

    httpClient.get(apiRequestUrl('/test')).subscribe({ error: () => undefined });

    const req = httpMock.expectOne(apiRequestUrl('/test'));
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(localStorage.getItem(TOKEN_KEY)).toBe('fake-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('en un 403 de la API redirige a /access-denied sin limpiar la sesión', () => {
    localStorage.setItem(TOKEN_KEY, 'fake-token');

    httpClient.get(apiRequestUrl('/test')).subscribe({ error: () => undefined });

    const req = httpMock.expectOne(apiRequestUrl('/test'));
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(localStorage.getItem(TOKEN_KEY)).toBe('fake-token');
    expect(router.navigate).toHaveBeenCalledWith(['/access-denied']);
  });

  it('en un 403 ya estando en /access-denied no vuelve a redirigir', () => {
    router.url = '/access-denied';
    localStorage.setItem(TOKEN_KEY, 'fake-token');

    httpClient.get(apiRequestUrl('/test')).subscribe({ error: () => undefined });

    const req = httpMock.expectOne(apiRequestUrl('/test'));
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
