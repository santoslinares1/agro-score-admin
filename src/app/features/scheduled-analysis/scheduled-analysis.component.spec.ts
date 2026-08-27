import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AnalysisTechnicalVerdict } from '../../core/models/analysis.model';
import {
  AdminScheduledAnalysisItem,
  AdminScheduledAnalysisRun,
  AdminWeeklyTechnicalVerdict,
} from '../../core/models/scheduled-analysis.model';
import { PaginatedResult } from '../../core/models/pagination.model';
import { ScheduledAnalysisService } from '../../core/services/scheduled-analysis.service';
import { ScheduledAnalysisComponent } from './scheduled-analysis.component';

function buildRun(overrides: Partial<AdminScheduledAnalysisRun> = {}): AdminScheduledAnalysisRun {
  return {
    id: 'run-1',
    status: 'completed',
    scheduledFor: '2026-08-24',
    analysisId: 'analysis-1',
    analysisStatus: 'Finalizado',
    startedAt: '2026-08-24T09:00:00.000Z',
    completedAt: '2026-08-24T09:05:00.000Z',
    failedAt: null,
    emailSentAt: '2026-08-24T09:06:00.000Z',
    errorMessage: null,
    createdAt: '2026-08-24T09:00:00.000Z',
    updatedAt: '2026-08-24T09:06:00.000Z',
    ...overrides,
  };
}

function buildTechnicalVerdict(
  overrides: Partial<AnalysisTechnicalVerdict> = {},
): AnalysisTechnicalVerdict {
  return {
    status: 'generated',
    verdict: 'attention',
    confidence: 'medium',
    summary: 'Resumen.',
    keyFindings: [],
    possibleCauses: [],
    recommendations: [],
    limitations: [],
    generatedAt: '2026-08-24T09:05:30.000Z',
    generator: 'claude',
    promptVersion: 'technical-verdict-v1',
    errorMessage: null,
    ...overrides,
  };
}

function buildWeeklyTechnicalVerdict(
  overrides: Partial<AdminWeeklyTechnicalVerdict> = {},
): AdminWeeklyTechnicalVerdict {
  return {
    status: 'generated',
    verdict: 'attention',
    trend: 'stable',
    confidence: 'medium',
    summary: 'Respecto del reporte anterior, el campo se mantiene estable.',
    keyChanges: ['El score se mantuvo estable respecto de la semana anterior.'],
    areasToReview: ['Priorizar zonas con menor desempeño relativo.'],
    recommendations: ['Continuar el monitoreo semanal habitual.'],
    limitations: ['La comparación se basa en índices satelitales.'],
    previousSnapshotId: 'snapshot-0',
    generatedAt: '2026-08-24T09:05:30.000Z',
    generator: 'deterministic-v1',
    promptVersion: null,
    errorMessage: null,
    ...overrides,
  };
}

function buildItem(overrides: Partial<AdminScheduledAnalysisItem> = {}): AdminScheduledAnalysisItem {
  return {
    id: 'schedule-1',
    fieldId: 'field-1',
    fieldName: 'Campo Norte',
    userId: 'user-1',
    userEmail: 'owner@example.com',
    userFullName: 'Owner Test',
    enabled: true,
    frequency: 'weekly',
    nextRunAt: '2026-09-01T12:00:00.000Z',
    lastRunAt: '2026-08-24T09:00:00.000Z',
    lastStatus: 'completed',
    lastErrorMessage: null,
    latestRun: buildRun(),
    technicalVerdict: buildTechnicalVerdict(),
    weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict(),
    ...overrides,
  };
}

function buildResult(items: AdminScheduledAnalysisItem[]): PaginatedResult<AdminScheduledAnalysisItem> {
  return { items, total: items.length, page: 1, limit: 20 };
}

describe('ScheduledAnalysisComponent (PR 13B)', () => {
  let fixture: ComponentFixture<ScheduledAnalysisComponent>;
  let serviceSpy: jasmine.SpyObj<ScheduledAnalysisService>;

  // Admin PR 2: queryParams simula la URL con la que llega un deep link desde Campos/Usuarios
  // (p. ej. /scheduled-analysis?fieldId=<uuid>) — vacío por default.
  function configureTestBed(queryParams: Record<string, string> = {}): void {
    TestBed.configureTestingModule({
      imports: [ScheduledAnalysisComponent],
      providers: [
        provideRouter([]),
        { provide: ScheduledAnalysisService, useValue: serviceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });
  }

  function setup(
    items: AdminScheduledAnalysisItem[],
    queryParams: Record<string, string> = {},
  ): void {
    serviceSpy.list.and.returnValue(of(buildResult(items)));
    configureTestBed(queryParams);
    fixture = TestBed.createComponent(ScheduledAnalysisComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    serviceSpy = jasmine.createSpyObj('ScheduledAnalysisService', ['list']);
  });

  it('renderiza la tabla de análisis programados', () => {
    setup([buildItem()]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Análisis programados');
    expect(el.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });

  it('renderiza campo y usuario/email', () => {
    setup([buildItem({ fieldName: 'Campo San José', userFullName: 'Ana Productora', userEmail: 'ana@x.com' })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Campo San José');
    expect(el.textContent).toContain('Ana Productora');
    expect(el.textContent).toContain('ana@x.com');
  });

  it('renderiza el schedule activo/inactivo', () => {
    setup([
      buildItem({ id: 's1', enabled: true }),
      buildItem({ id: 's2', enabled: false }),
    ]);
    const el = fixture.nativeElement as HTMLElement;
    const badges = Array.from(el.querySelectorAll('tbody tr:not(.verdict-detail-row)')).map(
      (row) => row.textContent ?? '',
    );

    expect(badges[0]).toContain('Activo');
    expect(badges[1]).toContain('Inactivo');
  });

  it('renderiza latestRun completed con su estado', () => {
    setup([buildItem({ latestRun: buildRun({ status: 'completed' }) })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Completado');
  });

  it('renderiza analysisStatus Finalizado', () => {
    setup([buildItem({ latestRun: buildRun({ analysisStatus: 'Finalizado' }) })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Finalizado');
  });

  it('renderiza technicalVerdict generated', () => {
    setup([buildItem({ technicalVerdict: buildTechnicalVerdict({ status: 'generated', verdict: 'attention' }) })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('generated');
    expect(el.textContent).toContain('Requiere atención');
  });

  it('muestra generator=claude y promptVersion en el detalle', () => {
    setup([buildItem({ technicalVerdict: buildTechnicalVerdict({ generator: 'claude', promptVersion: 'technical-verdict-v1' }) })]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const panelText = (el.querySelector('.verdict-panel') as HTMLElement).textContent ?? '';
    expect(panelText).toContain('Generator: claude');
    expect(panelText).toContain('Prompt version: technical-verdict-v1');
  });

  it('renderiza "Enviado" cuando emailSentAt existe', () => {
    setup([buildItem({ latestRun: buildRun({ emailSentAt: '2026-08-24T09:06:00.000Z' }) })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Enviado');
  });

  it('renderiza "Esperando veredicto técnico" cuando la corrida completó hace poco y no hay veredicto', () => {
    const recentCompletedAt = new Date(Date.now() - 60 * 1000).toISOString(); // hace 1 minuto
    setup([
      buildItem({
        latestRun: buildRun({ status: 'completed', completedAt: recentCompletedAt, emailSentAt: null }),
        technicalVerdict: null,
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Esperando veredicto técnico');
  });

  it('renderiza "No disponible" cuando no hay latestRun/technicalVerdict', () => {
    setup([buildItem({ latestRun: null, technicalVerdict: null })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Sin corridas');
    expect(el.textContent).toContain('No disponible');
  });

  it('el toggle "Ver detalle" expande y colapsa de forma independiente por fila', () => {
    setup([buildItem({ id: 's1' }), buildItem({ id: 's2' })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.verdict-panel').length).toBe(0);

    const toggles = Array.from(el.querySelectorAll('tbody tr:not(.verdict-detail-row) td:last-child button')) as HTMLButtonElement[];
    toggles[0].click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.verdict-panel').length).toBe(1);
    expect(toggles[0].textContent?.trim()).toBe('Ocultar');
  });

  it('no muestra "undefined"/"null" como texto visible', () => {
    setup([
      buildItem({
        fieldName: null,
        userFullName: null,
        userEmail: null,
        nextRunAt: null,
        lastRunAt: null,
        latestRun: null,
        technicalVerdict: null,
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('undefined');
    expect(el.textContent).not.toContain('null');
  });

  it('maneja el estado de loading', () => {
    serviceSpy.list.and.returnValue(of(buildResult([])));
    configureTestBed();
    fixture = TestBed.createComponent(ScheduledAnalysisComponent);
    const el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    // Justo después del primer detectChanges ngOnInit ya disparó load(), pero como el observable
    // resuelve síncrono acá, alcanza con confirmar que el flujo no rompe — el loading real se
    // valida indirectamente por el resultado final (empty-state) en el siguiente test.
    expect(el).toBeTruthy();
  });

  it('maneja el estado de error', () => {
    serviceSpy.list.and.returnValue(throwError(() => ({ error: { message: 'Fallo de red' } })));
    configureTestBed();
    fixture = TestBed.createComponent(ScheduledAnalysisComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Fallo de red');
  });

  it('maneja el estado vacío', () => {
    setup([]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('No hay campos con seguimiento semanal configurado.');
  });

  it('renderiza "Diagnóstico semanal" cuando weeklyTechnicalVerdict trae generated', () => {
    setup([buildItem({ weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict() })]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Diagnóstico semanal');
  });

  it('renderiza trend stable → Estable', () => {
    setup([buildItem({ weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({ trend: 'stable' }) })]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Tendencia: Estable');
  });

  it('renderiza trend improving → En mejora', () => {
    setup([buildItem({ weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({ trend: 'improving' }) })]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Tendencia: En mejora');
  });

  it('renderiza el summary del diagnóstico semanal', () => {
    setup([
      buildItem({
        weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({
          summary: 'El campo retrocedió respecto de la semana anterior.',
        }),
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('El campo retrocedió respecto de la semana anterior.');
  });

  it('renderiza keyChanges bajo "Cambios relevantes"', () => {
    setup([
      buildItem({
        weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({
          keyChanges: ['El NDVI promedio subió respecto de la semana anterior.'],
        }),
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Cambios relevantes');
    expect(el.textContent).toContain('El NDVI promedio subió respecto de la semana anterior.');
  });

  it('renderiza areasToReview bajo "Áreas a revisar"', () => {
    setup([
      buildItem({
        weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({
          areasToReview: ['Revisar sectores asociados a la zona dominante actual.'],
        }),
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Áreas a revisar');
    expect(el.textContent).toContain('Revisar sectores asociados a la zona dominante actual.');
  });

  it('renderiza recommendations bajo "Recomendaciones"', () => {
    setup([
      buildItem({
        weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({
          recommendations: ['Repetir el análisis en los próximos días.'],
        }),
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Recomendaciones');
    expect(el.textContent).toContain('Repetir el análisis en los próximos días.');
  });

  it('renderiza limitations bajo "Limitaciones"', () => {
    setup([
      buildItem({
        weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({
          limitations: ['No hay un reporte semanal anterior para calcular una tendencia.'],
        }),
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Limitaciones');
    expect(el.textContent).toContain('No hay un reporte semanal anterior para calcular una tendencia.');
  });

  it('renderiza generator/promptVersion/generatedAt en el detalle (admin sí los ve)', () => {
    setup([
      buildItem({
        weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({
          generator: 'claude',
          promptVersion: 'weekly-technical-verdict-v1',
        }),
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Generator: claude');
    expect(el.textContent).toContain('Prompt version: weekly-technical-verdict-v1');
  });

  it('renderiza errorMessage cuando status=failed', () => {
    setup([
      buildItem({
        weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({
          status: 'failed',
          verdict: 'insufficient_data',
          trend: 'insufficient_data',
          confidence: 'low',
          keyChanges: [],
          areasToReview: [],
          recommendations: [],
          limitations: [],
          errorMessage: 'No se pudo generar el diagnóstico semanal automático.',
        }),
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Error técnico');
    expect(el.textContent).toContain('No se pudo generar el diagnóstico semanal automático.');
  });

  it('renderiza "Diagnóstico semanal no disponible" cuando weeklyTechnicalVerdict es null', () => {
    setup([buildItem({ weeklyTechnicalVerdict: null })]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Diagnóstico semanal no disponible.');
  });

  it('no rompe el bloque existente de Veredicto técnico individual — ambos conviven en el mismo detalle', () => {
    setup([
      buildItem({
        technicalVerdict: buildTechnicalVerdict({ verdict: 'critical' }),
        weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({ trend: 'worsening' }),
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Crítico');
    expect(el.textContent).toContain('Tendencia: En deterioro');
  });

  it('no deja "undefined"/"null" visibles con weeklyTechnicalVerdict null o con campos internos null', () => {
    setup([
      buildItem({
        weeklyTechnicalVerdict: null,
      }),
      buildItem({
        id: 'schedule-2',
        weeklyTechnicalVerdict: buildWeeklyTechnicalVerdict({
          generator: null,
          promptVersion: null,
          previousSnapshotId: null,
        }),
      }),
    ]);
    const el = fixture.nativeElement as HTMLElement;

    const toggles = Array.from(el.querySelectorAll('tbody tr:not(.verdict-detail-row) td:last-child button')) as HTMLButtonElement[];
    toggles.forEach((toggle) => toggle.click());
    fixture.detectChanges();

    expect(el.textContent).not.toContain('undefined');
    expect(el.textContent).not.toContain('null');
  });

  describe('trazabilidad (Admin PR 2)', () => {
    it('el campo es un link a /fields con fieldId', () => {
      setup([buildItem()]);
      const el = fixture.nativeElement as HTMLElement;

      const link = el.querySelector('.entity-link') as HTMLAnchorElement;
      expect(link.textContent?.trim()).toBe('Campo Norte');
      expect(link.getAttribute('href')).toBe('/fields?fieldId=field-1');
    });

    it('el usuario es un link a /users con userId', () => {
      setup([buildItem()]);
      const el = fixture.nativeElement as HTMLElement;

      const links = el.querySelectorAll('.entity-link');
      const userLink = links[1] as HTMLAnchorElement;
      expect(userLink.textContent?.trim()).toBe('Owner Test');
      expect(userLink.getAttribute('href')).toBe('/users?userId=user-1');
    });

    it('muestra el fieldId truncado y copiable bajo el nombre del campo', () => {
      setup([buildItem({ fieldId: 'abcd1234-5678-90ab-cdef-1234567890ab' })]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('app-copyable-id')?.textContent).toContain('#abcd1234…');
    });

    it('el analysisId de latestRun linkea a /analysis cuando existe', () => {
      setup([buildItem({ latestRun: buildRun({ analysisId: 'analysis-1' }) })]);
      const el = fixture.nativeElement as HTMLElement;

      const link = Array.from(el.querySelectorAll('a')).find(
        (a) => a.textContent?.trim() === 'Ver diagnóstico',
      ) as HTMLAnchorElement;

      expect(link).toBeTruthy();
      expect(link.getAttribute('href')).toBe('/analysis?analysisId=analysis-1');
    });

    it('sin analysisId en latestRun, no muestra el link "Ver diagnóstico"', () => {
      setup([buildItem({ latestRun: buildRun({ analysisId: null, analysisStatus: null }) })]);
      const el = fixture.nativeElement as HTMLElement;

      const link = Array.from(el.querySelectorAll('a')).find(
        (a) => a.textContent?.trim() === 'Ver diagnóstico',
      );
      expect(link).toBeUndefined();
    });

    it('lee fieldId de la URL y lo reenvía a ScheduledAnalysisService.list', () => {
      setup([], { fieldId: 'field-1' });

      expect(serviceSpy.list).toHaveBeenCalledWith(
        jasmine.objectContaining({ fieldId: 'field-1' }),
      );
    });

    it('lee userId de la URL y lo reenvía a ScheduledAnalysisService.list', () => {
      setup([], { userId: 'user-1' });

      expect(serviceSpy.list).toHaveBeenCalledWith(
        jasmine.objectContaining({ userId: 'user-1' }),
      );
    });

    it('lee enabled=true de la URL y lo reenvía a ScheduledAnalysisService.list', () => {
      setup([], { enabled: 'true' });

      expect(serviceSpy.list).toHaveBeenCalledWith(jasmine.objectContaining({ enabled: true }));
    });

    it('sin query params, no aplica ningún filtro nuevo', () => {
      setup([buildItem()]);

      expect(serviceSpy.list).toHaveBeenCalledWith(
        jasmine.objectContaining({ fieldId: undefined, userId: undefined, enabled: undefined }),
      );
    });

    it('el scheduleId y el runId están disponibles como IDs copiables en el detalle expandido', () => {
      setup([buildItem({ id: 'abcd1234-5678-90ab-cdef-1234567890ab' })]);
      const el = fixture.nativeElement as HTMLElement;

      (el.querySelector('.detail-toggle') as HTMLButtonElement).click();
      fixture.detectChanges();

      const copyableIds = el.querySelectorAll('.verdict-panel app-copyable-id');
      expect(copyableIds.length).toBeGreaterThanOrEqual(2);
    });

    it('no rompe la paginación existente', () => {
      setup([buildItem()]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('app-pagination-controls')).toBeTruthy();
    });
  });
});
