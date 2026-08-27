import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AdminLot } from '../../core/models/lot.model';
import { PaginatedResult } from '../../core/models/pagination.model';
import { LotsService } from '../../core/services/lots.service';
import { LotsComponent } from './lots.component';

function buildLot(overrides: Partial<AdminLot> = {}): AdminLot {
  return {
    id: 'lot-1',
    name: 'Lote 1',
    fieldId: 'field-1',
    fieldName: 'Campo Norte',
    ownerId: 'user-1',
    ownerEmail: 'owner@example.com',
    ownerFullName: 'Owner Test',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

function buildResult(items: AdminLot[]): PaginatedResult<AdminLot> {
  return { items, total: items.length, page: 1, limit: 20 };
}

describe('LotsComponent — trazabilidad (Admin PR 2)', () => {
  let fixture: ComponentFixture<LotsComponent>;
  let lotsServiceSpy: jasmine.SpyObj<LotsService>;

  function setup(items: AdminLot[], queryParams: Record<string, string> = {}): void {
    lotsServiceSpy.list.and.returnValue(of(buildResult(items)));

    TestBed.configureTestingModule({
      imports: [LotsComponent],
      providers: [
        provideRouter([]),
        { provide: LotsService, useValue: lotsServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });

    fixture = TestBed.createComponent(LotsComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    lotsServiceSpy = jasmine.createSpyObj('LotsService', ['list']);
  });

  it('el campo es un link a /fields con fieldId', () => {
    setup([buildLot()]);
    const el = fixture.nativeElement as HTMLElement;

    const link = el.querySelector('.entity-link') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Campo Norte');
    expect(link.getAttribute('href')).toBe('/fields?fieldId=field-1');
  });

  it('el dueño es un link a /users con userId', () => {
    setup([buildLot()]);
    const el = fixture.nativeElement as HTMLElement;

    const links = el.querySelectorAll('.entity-link');
    const ownerLink = links[1] as HTMLAnchorElement;
    expect(ownerLink.textContent?.trim()).toBe('Owner Test');
    expect(ownerLink.getAttribute('href')).toBe('/users?userId=user-1');
  });

  it('sin ownerId, muestra "—" en vez de un link roto', () => {
    setup([buildLot({ ownerId: null, ownerFullName: null, ownerEmail: null })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('—');
  });

  it('lee fieldId de la URL y lo reenvía a LotsService.list', () => {
    setup([], { fieldId: 'field-1' });

    expect(lotsServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ fieldId: 'field-1' }),
    );
  });

  it('lee userId de la URL y lo reenvía a LotsService.list', () => {
    setup([], { userId: 'user-1' });

    expect(lotsServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ userId: 'user-1' }),
    );
  });

  it('sin query params, no aplica ningún filtro nuevo', () => {
    setup([buildLot()]);

    expect(lotsServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ fieldId: undefined, userId: undefined }),
    );
  });

  it('"Quitar filtro" limpia fieldId y recarga', () => {
    setup([], { fieldId: 'field-1' });
    lotsServiceSpy.list.calls.reset();
    lotsServiceSpy.list.and.returnValue(of(buildResult([buildLot()])));

    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.filter-chip button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(lotsServiceSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ fieldId: undefined }),
    );
  });

  it('no muestra undefined/null en la fila', () => {
    setup([buildLot()]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('undefined');
    expect(el.textContent).not.toContain('null');
  });

  describe('Contexto mínimo del campo (Admin PR 5)', () => {
    it('renderiza "Con diagnóstico" cuando el campo del lote tiene análisis', () => {
      setup([buildLot({ fieldHasAnalysis: true })]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Con diagnóstico');
    });

    it('renderiza "Sin diagnóstico" cuando el campo del lote no tiene análisis (o el dato no vino)', () => {
      setup([buildLot({ fieldHasAnalysis: false })]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Sin diagnóstico');
    });

    it('renderiza "Monitoreo activo"/"Monitoreo inactivo" según fieldHasActiveMonitoring', () => {
      setup([
        buildLot({ id: 'lot-1', fieldHasActiveMonitoring: true }),
        buildLot({ id: 'lot-2', fieldHasActiveMonitoring: false }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Monitoreo activo');
      expect(el.textContent).toContain('Monitoreo inactivo');
    });

    it('sigue linkeando campo y dueño (PR2) junto al contexto nuevo', () => {
      setup([buildLot({ fieldHasAnalysis: true, fieldHasActiveMonitoring: true })]);
      const el = fixture.nativeElement as HTMLElement;

      const fieldLink = el.querySelector('.entity-link') as HTMLAnchorElement;
      expect(fieldLink.getAttribute('href')).toBe('/fields?fieldId=field-1');
    });

    it('no rompe el estado vacío ni la paginación existentes', () => {
      setup([]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('.empty-state')?.textContent).toContain(
        'No hay lotes para mostrar.',
      );
    });
  });
});
