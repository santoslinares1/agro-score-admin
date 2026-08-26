import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { AdminField } from '../../core/models/field.model';
import { PaginatedResult } from '../../core/models/pagination.model';
import { FieldsService } from '../../core/services/fields.service';
import { FieldsComponent } from './fields.component';

function buildField(overrides: Partial<AdminField> = {}): AdminField {
  return {
    id: 'field-1',
    name: 'Campo Norte',
    ownerId: 'user-1',
    ownerEmail: 'owner@example.com',
    ownerFullName: 'Owner Test',
    lotsCount: 3,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

function buildResult(items: AdminField[]): PaginatedResult<AdminField> {
  return { items, total: items.length, page: 1, limit: 20 };
}

describe('FieldsComponent (Admin PR 1 — deep link hasAnalysis)', () => {
  let fixture: ComponentFixture<FieldsComponent>;
  let fieldsServiceSpy: jasmine.SpyObj<FieldsService>;

  function setup(items: AdminField[], queryParams: Record<string, string> = {}): void {
    fieldsServiceSpy.list.and.returnValue(of(buildResult(items)));

    TestBed.configureTestingModule({
      imports: [FieldsComponent],
      providers: [
        { provide: FieldsService, useValue: fieldsServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });

    fixture = TestBed.createComponent(FieldsComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fieldsServiceSpy = jasmine.createSpyObj('FieldsService', ['list']);
  });

  it('sin query params, carga sin filtro de hasAnalysis (comportamiento normal)', () => {
    setup([buildField()]);

    expect(fieldsServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ hasAnalysis: undefined }),
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.filter-chip')).toBeNull();
  });

  it('lee hasAnalysis=false de la URL y lo pasa a FieldsService.list', () => {
    setup([], { hasAnalysis: 'false' });

    expect(fieldsServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ hasAnalysis: false }),
    );
  });

  it('muestra un chip "Filtro activo: campos sin diagnóstico" cuando hasAnalysis=false viene de la URL', () => {
    setup([], { hasAnalysis: 'false' });

    const el = fixture.nativeElement as HTMLElement;
    const chip = el.querySelector('.filter-chip');
    expect(chip?.textContent).toContain('Filtro activo: campos sin diagnóstico');
  });

  it('"Quitar filtro" limpia hasAnalysis y vuelve a pedir la lista sin el filtro', () => {
    setup([], { hasAnalysis: 'false' });
    fieldsServiceSpy.list.calls.reset();
    fieldsServiceSpy.list.and.returnValue(of(buildResult([buildField()])));

    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.filter-chip button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fieldsServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ hasAnalysis: undefined }),
    );
    expect(el.querySelector('.filter-chip')).toBeNull();
  });

  it('ignora un hasAnalysis que no sea "true"/"false" en la URL', () => {
    setup([], { hasAnalysis: 'maybe' });

    expect(fieldsServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ hasAnalysis: undefined }),
    );
  });

  it('sigue renderizando la tabla de campos con el filtro aplicado', () => {
    setup([buildField({ name: 'Campo Sin Diagnóstico' })], { hasAnalysis: 'false' });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Campo Sin Diagnóstico');
  });
});
