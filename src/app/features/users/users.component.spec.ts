import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { AdminUser } from '../../core/models/user.model';
import { PaginatedResult } from '../../core/models/pagination.model';
import { UsersService } from '../../core/services/users.service';
import { UsersComponent } from './users.component';

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-1',
    email: 'ana@example.com',
    fullName: 'Ana Test',
    role: 'user',
    isActive: true,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

function buildResult(items: AdminUser[]): PaginatedResult<AdminUser> {
  return { items, total: items.length, page: 1, limit: 20 };
}

describe('UsersComponent — trazabilidad (Admin PR 2)', () => {
  let fixture: ComponentFixture<UsersComponent>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;

  function setup(items: AdminUser[], queryParams: Record<string, string> = {}): void {
    usersServiceSpy.list.and.returnValue(of(buildResult(items)));

    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        { provide: UsersService, useValue: usersServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });

    fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    usersServiceSpy = jasmine.createSpyObj('UsersService', [
      'list',
      'create',
      'update',
      'deactivate',
      'createInvitation',
      'requestPasswordReset',
    ]);
  });

  it('renderiza el link "Ver campos" con queryParams userId', () => {
    setup([buildUser()]);
    const el = fixture.nativeElement as HTMLElement;

    const link = Array.from(el.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === 'Ver campos',
    ) as HTMLAnchorElement;

    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/fields?userId=user-1');
  });

  // Admin PR 7: el email ahora abre el detalle de usuario, no solo texto plano.
  it('linkea el email al detalle de usuario (/users/:userId)', () => {
    setup([buildUser({ id: 'user-1', email: 'ana@example.com' })]);
    const el = fixture.nativeElement as HTMLElement;

    const link = Array.from(el.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === 'ana@example.com',
    ) as HTMLAnchorElement;

    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/users/user-1');
  });

  it('renderiza el link "Ver diagnósticos" con queryParams userId', () => {
    setup([buildUser()]);
    const el = fixture.nativeElement as HTMLElement;

    const link = Array.from(el.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === 'Ver diagnósticos',
    ) as HTMLAnchorElement;

    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/analysis?userId=user-1');
  });

  it('muestra el userId truncado y copiable bajo el email', () => {
    setup([buildUser({ id: 'abcd1234-5678-90ab-cdef-1234567890ab' })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('app-copyable-id')?.textContent).toContain('#abcd1234…');
  });

  it('lee userId de la URL y lo reenvía a UsersService.list', () => {
    setup([], { userId: 'user-1' });

    expect(usersServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ userId: 'user-1' }),
    );
  });

  it('muestra un chip de filtro activo cuando userId viene de la URL, con botón para quitarlo', () => {
    setup([buildUser()], { userId: 'user-1' });
    const el = fixture.nativeElement as HTMLElement;

    const chip = el.querySelector('.filter-chip');
    expect(chip?.textContent).toContain('Filtro activo: usuario');

    usersServiceSpy.list.calls.reset();
    usersServiceSpy.list.and.returnValue(of(buildResult([buildUser()])));

    (chip?.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(usersServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ userId: undefined }),
    );
  });

  it('lee email de la URL y lo aplica como búsqueda de texto (search)', () => {
    setup([], { email: 'ana@example.com' });

    expect(usersServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ search: 'ana@example.com' }),
    );
  });

  it('sin query params, no aplica ningún filtro nuevo (comportamiento normal)', () => {
    setup([buildUser()]);

    expect(usersServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ userId: undefined, search: undefined }),
    );
  });

  it('las acciones existentes (Editar/Generar reset/Desactivar) siguen disponibles', () => {
    setup([buildUser()]);
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('td.actions button')).map((b) =>
      b.textContent?.trim(),
    );

    expect(buttons).toContain('Editar');
    expect(buttons).toContain('Generar reset');
    expect(buttons).toContain('Desactivar');
  });

  it('no muestra undefined/null en la fila', () => {
    setup([buildUser()]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('undefined');
    expect(el.textContent).not.toContain('null');
  });
});
