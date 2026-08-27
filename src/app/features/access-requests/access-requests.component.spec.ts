import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminAccessRequest, CreateUserFromAccessRequestResult } from '../../core/models/access-request.model';
import { PaginatedResult } from '../../core/models/pagination.model';
import { AccessRequestsService } from '../../core/services/access-requests.service';
import { UsersService } from '../../core/services/users.service';
import { AccessRequestsComponent } from './access-requests.component';

function buildRequest(overrides: Partial<AdminAccessRequest> = {}): AdminAccessRequest {
  return {
    id: 'req-1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    organization: 'Campo Test',
    profile: 'producer',
    estimatedSurface: null,
    message: null,
    status: 'interested',
    internalNotes: null,
    assignedToUserId: null,
    contactedAt: null,
    convertedAt: null,
    discardedAt: null,
    createdAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

function buildInvitationResult(): CreateUserFromAccessRequestResult {
  return {
    accessRequest: buildRequest({ status: 'converted', convertedAt: '2026-08-27T10:00:00.000Z' }),
    invitation: {
      id: 'invitation-1',
      email: 'juan@example.com',
      role: 'user',
      expiresAt: '2026-09-03T10:00:00.000Z',
      emailSent: true,
      dryRun: false,
      provider: 'resend',
    },
  };
}

// Fix confirmación (auditoría final pre-demo): "Crear usuario desde esta solicitud" ejecutaba con
// un solo click + un `window.confirm()` nativo sin estilo. Ahora hay un paso de confirmación
// in-app explícito (email/nombre/rol + botones Cancelar/Crear usuario) antes de llamar al service.
describe('AccessRequestsComponent — confirmación de creación de usuario', () => {
  let fixture: ComponentFixture<AccessRequestsComponent>;
  let accessRequestsServiceSpy: jasmine.SpyObj<AccessRequestsService>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;

  function setup(item: AdminAccessRequest = buildRequest()): void {
    accessRequestsServiceSpy = jasmine.createSpyObj('AccessRequestsService', [
      'list',
      'update',
      'createUserFromRequest',
    ]);
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['list']);

    const result: PaginatedResult<AdminAccessRequest> = {
      items: [item],
      total: 1,
      page: 1,
      limit: 20,
    };
    accessRequestsServiceSpy.list.and.returnValue(of(result));
    accessRequestsServiceSpy.createUserFromRequest.and.returnValue(of(buildInvitationResult()));
    usersServiceSpy.list.and.returnValue(of({ items: [], total: 0, page: 1, limit: 100 }));

    TestBed.configureTestingModule({
      imports: [AccessRequestsComponent],
      providers: [
        { provide: AccessRequestsService, useValue: accessRequestsServiceSpy },
        { provide: UsersService, useValue: usersServiceSpy },
      ],
    });

    fixture = TestBed.createComponent(AccessRequestsComponent);
    fixture.detectChanges();
  }

  function openDetailAndStartCreateUser(el: HTMLElement): void {
    (el.querySelector('button') as HTMLButtonElement).click(); // "Ver detalle" de la única fila
    fixture.detectChanges();

    const openBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Crear usuario desde esta solicitud',
    ) as HTMLButtonElement;
    openBtn.click();
    fixture.detectChanges();
  }

  it('clickear "Crear usuario desde esta solicitud" no llama al service todavía (1)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;
    openDetailAndStartCreateUser(el);

    expect(accessRequestsServiceSpy.createUserFromRequest).not.toHaveBeenCalled();
  });

  it('"Continuar" muestra la confirmación con email/nombre/rol y todavía no llama al service (7)', () => {
    setup(buildRequest({ email: 'juan@example.com', name: 'Juan Pérez' }));
    const el = fixture.nativeElement as HTMLElement;
    openDetailAndStartCreateUser(el);

    const continueBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Continuar',
    ) as HTMLButtonElement;
    continueBtn.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('¿Crear usuario para');
    expect(el.textContent).toContain('juan@example.com');
    expect(el.textContent).toContain('Juan Pérez');
    expect(el.querySelector('.confirm-summary')?.textContent).toContain('user');
    expect(accessRequestsServiceSpy.createUserFromRequest).not.toHaveBeenCalled();
  });

  it('cancelar en la confirmación no llama al service y vuelve al selector de rol (8)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;
    openDetailAndStartCreateUser(el);

    (Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Continuar',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    (Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(accessRequestsServiceSpy.createUserFromRequest).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Rol del nuevo usuario');
    expect(el.textContent).not.toContain('¿Crear usuario para');
  });

  it('confirmar en el paso final sí llama al service con el rol elegido (9)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;
    openDetailAndStartCreateUser(el);

    (Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Continuar',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    (Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Crear usuario',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(accessRequestsServiceSpy.createUserFromRequest).toHaveBeenCalledWith(
      'req-1',
      { role: 'user' },
    );
  });

  it('nunca aparece un window.confirm nativo (no hay spy configurado y el flujo igual funciona)', () => {
    // Si el código todavía llamara a `confirm()`, este test fallaría con
    // "Unexpected call to WindowStub.prototype.confirm" en el entorno de test (Karma/Jasmine no
    // permite diálogos nativos) — pasar sin espiar `window.confirm` es en sí la prueba.
    setup();
    const el = fixture.nativeElement as HTMLElement;
    openDetailAndStartCreateUser(el);

    (Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Continuar',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();
    (Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Crear usuario',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(accessRequestsServiceSpy.createUserFromRequest).toHaveBeenCalled();
  });
});
