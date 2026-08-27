import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
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
        provideRouter([]),
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

  describe('trazabilidad (Admin PR 2)', () => {
    it('el nombre del campo es un link a /analysis con fieldId', () => {
      setup([buildField()]);
      const el = fixture.nativeElement as HTMLElement;

      const link = el.querySelector('.entity-link') as HTMLAnchorElement;
      expect(link.textContent?.trim()).toBe('Campo Norte');
      expect(link.getAttribute('href')).toBe('/analysis?fieldId=field-1');
    });

    it('el dueño es un link a /users con userId', () => {
      setup([buildField()]);
      const el = fixture.nativeElement as HTMLElement;

      const links = el.querySelectorAll('.entity-link');
      const ownerLink = links[1] as HTMLAnchorElement;
      expect(ownerLink.textContent?.trim()).toBe('Owner Test');
      expect(ownerLink.getAttribute('href')).toBe('/users?userId=user-1');
    });

    it('tiene una acción "Ver programados" con fieldId', () => {
      setup([buildField()]);
      const el = fixture.nativeElement as HTMLElement;

      const link = Array.from(el.querySelectorAll('a')).find(
        (a) => a.textContent?.trim() === 'Ver programados',
      ) as HTMLAnchorElement;

      expect(link).toBeTruthy();
      expect(link.getAttribute('href')).toBe('/scheduled-analysis?fieldId=field-1');
    });

    it('muestra el fieldId truncado y copiable bajo el nombre', () => {
      setup([buildField({ id: 'abcd1234-5678-90ab-cdef-1234567890ab' })]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('app-copyable-id')?.textContent).toContain('#abcd1234…');
    });

    it('lee userId de la URL y lo reenvía a FieldsService.list', () => {
      setup([], { userId: 'user-1' });

      expect(fieldsServiceSpy.list).toHaveBeenCalledWith(
        jasmine.objectContaining({ userId: 'user-1' }),
      );
    });

    it('lee fieldId de la URL y lo reenvía a FieldsService.list', () => {
      setup([], { fieldId: 'field-1' });

      expect(fieldsServiceSpy.list).toHaveBeenCalledWith(
        jasmine.objectContaining({ fieldId: 'field-1' }),
      );
    });

    it('muestra un chip por cada filtro activo (userId y fieldId pueden convivir)', () => {
      setup([], { userId: 'user-1', fieldId: 'field-1' });
      const el = fixture.nativeElement as HTMLElement;

      const chips = el.querySelectorAll('.filter-chip');
      expect(chips.length).toBe(2);
    });

    it('no muestra undefined/null en la tabla', () => {
      setup([buildField()]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).not.toContain('undefined');
      expect(el.textContent).not.toContain('null');
    });
  });

  describe('Estado real de uso/producto (Admin PR 5)', () => {
    it('renderiza el badge de Estado y "Sin diagnóstico" cuando el campo no tiene análisis', () => {
      setup([buildField({ analysisStatus: 'without_analysis', latestAnalysis: null })]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Sin diagnóstico');
      expect(el.textContent).toContain('Este campo todavía no tiene diagnósticos.');
    });

    it('renderiza el badge "Error" cuando el último análisis está en Error', () => {
      setup([
        buildField({
          analysisStatus: 'error',
          requiresAttention: true,
          latestAnalysis: {
            id: 'analysis-1',
            status: 'Error',
            createdAt: '2026-08-10T00:00:00.000Z',
            completedAt: null,
            durationMs: null,
            score: null,
          },
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      const badges = Array.from(el.querySelectorAll('app-status-badge .badge')).map((b) =>
        b.textContent?.trim(),
      );
      expect(badges).toContain('Error');
    });

    it('renderiza "Requiere atención" cuando requiresAttention=true', () => {
      setup([
        buildField({
          analysisStatus: 'attention',
          requiresAttention: true,
          latestAnalysis: {
            id: 'analysis-1',
            status: 'Finalizado',
            createdAt: '2026-08-10T00:00:00.000Z',
            completedAt: '2026-08-10T01:00:00.000Z',
            durationMs: 4000,
            score: 35,
          },
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;
      const badges = Array.from(el.querySelectorAll('app-status-badge .badge')).map((b) =>
        b.textContent?.trim(),
      );

      expect(badges.filter((b) => b === 'Requiere atención').length).toBeGreaterThan(0);
    });

    it('el "Último análisis" linkea a /analysis?analysisId=<id>', () => {
      setup([
        buildField({
          latestAnalysis: {
            id: 'analysis-1',
            status: 'Finalizado',
            createdAt: '2026-08-10T00:00:00.000Z',
            completedAt: '2026-08-10T01:00:00.000Z',
            durationMs: 4000,
            score: 72,
          },
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      const link = Array.from(el.querySelectorAll('a')).find(
        (a) => a.getAttribute('href') === '/analysis?analysisId=analysis-1',
      );
      expect(link).toBeTruthy();
    });

    it('renderiza el score cuando existe, con su banda visual', () => {
      setup([
        buildField({
          latestAnalysis: {
            id: 'analysis-1',
            status: 'Finalizado',
            createdAt: '2026-08-10T00:00:00.000Z',
            completedAt: '2026-08-10T01:00:00.000Z',
            durationMs: 4000,
            score: 72,
          },
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('72');
      expect(el.textContent).toContain('Favorable');
    });

    it('no muestra el score cuando el análisis todavía está Procesando (score=null)', () => {
      setup([
        buildField({
          analysisStatus: 'processing',
          latestAnalysis: {
            id: 'analysis-1',
            status: 'Procesando',
            createdAt: '2026-08-10T00:00:00.000Z',
            completedAt: null,
            durationMs: null,
            score: null,
          },
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Score no disponible.');
    });

    it('no muestra undefined/null/NaN con datos completos (score, veredicto, monitoreo, atención)', () => {
      setup([
        buildField({
          analysisStatus: 'attention',
          requiresAttention: true,
          latestAnalysis: {
            id: 'analysis-1',
            status: 'Finalizado',
            createdAt: '2026-08-10T00:00:00.000Z',
            completedAt: '2026-08-10T01:00:00.000Z',
            durationMs: 4000,
            score: 41,
          },
          technicalVerdict: {
            status: 'generated',
            verdict: 'attention',
            confidence: 'medium',
            summary: 'Zona con variabilidad relevante.',
            keyFindings: [],
            possibleCauses: [],
            recommendations: [],
            limitations: [],
            generatedAt: '2026-08-10T01:05:00.000Z',
            generator: 'deterministic-v1',
            promptVersion: null,
            errorMessage: null,
          },
          weeklyMonitoring: {
            active: true,
            scheduleId: 'schedule-1',
            nextRunAt: '2026-09-01T09:00:00.000Z',
            lastRunAt: null,
            hasRuns: false,
          },
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).not.toContain('undefined');
      expect(el.textContent).not.toContain('null');
      expect(el.textContent).not.toContain('NaN');
    });

    it('renderiza "Activo" y la próxima corrida cuando el monitoreo semanal está activo', () => {
      setup([
        buildField({
          weeklyMonitoring: {
            active: true,
            scheduleId: 'schedule-1',
            nextRunAt: '2026-09-01T09:00:00.000Z',
            lastRunAt: null,
            hasRuns: false,
          },
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Activo');
      expect(el.textContent).toContain('Próxima corrida');
    });

    it('renderiza "Inactivo" cuando no hay monitoreo semanal', () => {
      setup([buildField()]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Inactivo');
    });

    it('lee status=attention de la URL y lo reenvía a FieldsService.list', () => {
      setup([], { status: 'attention' });

      expect(fieldsServiceSpy.list).toHaveBeenCalledWith(
        jasmine.objectContaining({ status: 'attention' }),
      );
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.filter-chip')?.textContent).toContain(
        'estado = Requiere atención',
      );
    });

    it('lee monitoring=active de la URL y lo reenvía a FieldsService.list', () => {
      setup([], { monitoring: 'active' });

      expect(fieldsServiceSpy.list).toHaveBeenCalledWith(
        jasmine.objectContaining({ monitoring: 'active' }),
      );
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.filter-chip')?.textContent).toContain('monitoreo activo');
    });

    it('ignora un status que no sea uno de los 5 valores válidos', () => {
      setup([], { status: 'bogus' });

      expect(fieldsServiceSpy.list).toHaveBeenCalledWith(
        jasmine.objectContaining({ status: undefined }),
      );
    });

    it('sigue soportando hasAnalysis/userId/fieldId (PR1/PR2) junto a status/monitoring', () => {
      setup([], { hasAnalysis: 'false', userId: 'user-1', fieldId: 'field-1' });

      expect(fieldsServiceSpy.list).toHaveBeenCalledWith(
        jasmine.objectContaining({
          hasAnalysis: false,
          userId: 'user-1',
          fieldId: 'field-1',
        }),
      );
    });

    it('el link "Ver programados" (Acciones) y app-copyable-id del nombre siguen funcionando', () => {
      setup([buildField({ id: 'abcd1234-5678-90ab-cdef-1234567890ab' })]);
      const el = fixture.nativeElement as HTMLElement;

      const scheduledLink = Array.from(el.querySelectorAll('a')).find(
        (a) => a.textContent?.trim() === 'Ver programados',
      ) as HTMLAnchorElement;
      expect(scheduledLink.getAttribute('href')).toBe(
        '/scheduled-analysis?fieldId=abcd1234-5678-90ab-cdef-1234567890ab',
      );
      expect(el.querySelector('app-copyable-id')?.textContent).toContain('#abcd1234…');
    });
  });
});
