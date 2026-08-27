import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AdminFieldDetail } from '../../../core/models/field-detail.model';
import { FieldDetailService } from '../../../core/services/field-detail.service';
import { FieldDetailComponent } from './field-detail.component';

function buildDetail(overrides: Partial<AdminFieldDetail> = {}): AdminFieldDetail {
  return {
    field: {
      id: 'field-1',
      name: 'Campo Norte',
      ownerId: 'user-1',
      ownerEmail: 'owner@example.com',
      ownerFullName: 'Owner Test',
      lotsCount: 2,
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
      analysisStatus: 'without_analysis',
      requiresAttention: false,
    },
    latestAnalysis: null,
    technicalVerdict: null,
    lots: [],
    analyses: [],
    weeklyMonitoring: {
      active: false,
      scheduleId: null,
      frequency: null,
      nextRunAt: null,
      lastRunAt: null,
      hasRuns: false,
    },
    scheduledRuns: [],
    ...overrides,
  };
}

describe('FieldDetailComponent (Admin PR 6)', () => {
  let fixture: ComponentFixture<FieldDetailComponent>;
  let serviceSpy: jasmine.SpyObj<FieldDetailService>;

  function setup(
    config: {
      detail?: AdminFieldDetail;
      error?: HttpErrorResponse;
      pending?: Subject<AdminFieldDetail>;
      fieldId?: string;
    } = {},
  ): void {
    serviceSpy = jasmine.createSpyObj('FieldDetailService', ['get']);

    if (config.pending) {
      serviceSpy.get.and.returnValue(config.pending.asObservable());
    } else if (config.error) {
      serviceSpy.get.and.returnValue(throwError(() => config.error));
    } else {
      serviceSpy.get.and.returnValue(of(config.detail ?? buildDetail()));
    }

    TestBed.configureTestingModule({
      imports: [FieldDetailComponent],
      providers: [
        provideRouter([]),
        { provide: FieldDetailService, useValue: serviceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ fieldId: config.fieldId ?? 'field-1' }) },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(FieldDetailComponent);
    fixture.detectChanges();
  }

  it('lee el fieldId de la ruta y llama a FieldDetailService.get (1)', () => {
    setup({ fieldId: 'field-9' });
    expect(serviceSpy.get).toHaveBeenCalledWith('field-9');
  });

  it('renderiza el estado de carga mientras la respuesta no llegó (2)', () => {
    const pending = new Subject<AdminFieldDetail>();
    setup({ pending });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.loading-state')?.textContent).toContain('Cargando');
  });

  it('renderiza un mensaje humano de "no encontrado" en un 404 (3)', () => {
    setup({ error: new HttpErrorResponse({ status: 404 }) });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Campo no encontrado');
    expect(el.textContent).not.toContain('404');
  });

  it('renderiza un mensaje de error genérico ante un fallo distinto de 404 (3)', () => {
    setup({ error: new HttpErrorResponse({ status: 500 }) });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.error-banner')?.textContent).toContain(
      'No se pudo cargar el detalle del campo.',
    );
  });

  it('renderiza el header con nombre, dueño e ID copiable (4)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toBe('Campo Norte');
    expect(el.textContent).toContain('Owner Test');
    expect(el.textContent).toContain('owner@example.com');
    expect(el.querySelector('app-copyable-id')?.textContent).toContain('#field-1…');
  });

  it('renderiza el badge de analysisStatus en el header (5)', () => {
    setup({ detail: buildDetail({ field: { ...buildDetail().field, analysisStatus: 'error' } }) });
    const el = fixture.nativeElement as HTMLElement;
    const badges = Array.from(el.querySelectorAll('app-status-badge .badge')).map((b) =>
      b.textContent?.trim(),
    );

    expect(badges).toContain('Error');
  });

  it('renderiza requiresAttention en el header (6)', () => {
    setup({
      detail: buildDetail({
        field: { ...buildDetail().field, analysisStatus: 'error', requiresAttention: true },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;
    const badges = Array.from(el.querySelectorAll('app-status-badge .badge')).map((b) =>
      b.textContent?.trim(),
    );

    expect(badges).toContain('Requiere atención');
  });

  it('renderiza el resumen operativo con lotes/último análisis/score/veredicto/monitoreo/mail (7)', () => {
    setup({
      detail: buildDetail({
        field: { ...buildDetail().field, lotsCount: 5 },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Resumen operativo');
    const grid = el.querySelector('.fd-summary-grid');
    expect(grid?.textContent).toContain('5');
  });

  it('renderiza el bloque de Último análisis con estado/fecha/duración/score/link (8)', () => {
    setup({
      detail: buildDetail({
        latestAnalysis: {
          id: 'analysis-1',
          status: 'Finalizado',
          createdAt: '2026-08-10T00:00:00.000Z',
          completedAt: '2026-08-10T01:00:00.000Z',
          durationMs: 5000,
          score: 72,
        },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('72');
    expect(el.textContent).toContain('Favorable');
    const link = Array.from(el.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/analysis?analysisId=analysis-1',
    );
    expect(link).toBeTruthy();
  });

  it('renderiza el estado vacío "todavía no tiene diagnósticos" si no hay análisis (9)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Este campo todavía no tiene diagnósticos.');
  });

  it('renderiza el veredicto técnico si existe (10)', () => {
    setup({
      detail: buildDetail({
        technicalVerdict: {
          status: 'generated',
          verdict: 'attention',
          confidence: 'medium',
          summary: 'Zona con variabilidad relevante.',
          keyFindings: ['Sector norte con NDVI bajo'],
          possibleCauses: [],
          recommendations: ['Revisar riego del sector norte'],
          limitations: [],
          generatedAt: '2026-08-10T01:05:00.000Z',
          generator: 'deterministic-v1',
          promptVersion: null,
          errorMessage: null,
        },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Zona con variabilidad relevante.');
    expect(el.textContent).toContain('Sector norte con NDVI bajo');
    expect(el.textContent).toContain('Revisar riego del sector norte');
  });

  it('renderiza el estado vacío de veredicto técnico si no existe (11)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Veredicto técnico no disponible para este campo.');
  });

  it('renderiza los lotes del campo (12)', () => {
    setup({
      detail: buildDetail({
        lots: [
          {
            id: 'lot-1',
            name: 'Lote Norte',
            createdAt: '2026-08-02T00:00:00.000Z',
            updatedAt: '2026-08-02T00:00:00.000Z',
          },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Lote Norte');
  });

  it('renderiza el historial de análisis (13)', () => {
    setup({
      detail: buildDetail({
        analyses: [
          {
            id: 'analysis-2',
            status: 'Error',
            createdAt: '2026-08-05T00:00:00.000Z',
            completedAt: null,
            durationMs: null,
            score: null,
            errorMessage: 'Nubosidad excesiva',
            reviewedAt: null,
            reviewedByUserId: null,
          },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Historial de análisis');
    expect(el.textContent).toContain('Nubosidad excesiva');
  });

  it('renderiza el monitoreo semanal activo con frecuencia/próxima corrida (14)', () => {
    setup({
      detail: buildDetail({
        weeklyMonitoring: {
          active: true,
          scheduleId: 'schedule-1',
          frequency: 'weekly',
          nextRunAt: '2026-09-01T09:00:00.000Z',
          lastRunAt: null,
          hasRuns: false,
        },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Activo');
    expect(el.textContent).toContain('Semanal');
  });

  it('renderiza "no tiene monitoreo semanal activo" cuando está inactivo (15)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Este campo no tiene monitoreo semanal activo.');
  });

  it('renderiza las corridas y su estado de mail (16)', () => {
    setup({
      detail: buildDetail({
        scheduledRuns: [
          {
            id: 'run-1',
            status: 'completed',
            scheduledFor: '2026-08-24',
            analysisId: 'analysis-9',
            analysisStatus: 'Finalizado',
            startedAt: '2026-08-24T09:00:00.000Z',
            completedAt: '2026-08-24T09:05:00.000Z',
            failedAt: null,
            emailSentAt: '2026-08-24T09:10:00.000Z',
            errorMessage: null,
            createdAt: '2026-08-24T09:00:00.000Z',
            updatedAt: '2026-08-24T09:10:00.000Z',
            weeklyTechnicalVerdict: null,
          },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Corridas y mails');
    expect(el.textContent).toContain('Enviado');
  });

  it('los links a Diagnósticos/Lotes/Programados funcionan (17)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).map((a) => ({
      text: a.textContent?.trim(),
      href: a.getAttribute('href'),
    }));

    expect(links).toEqual(
      jasmine.arrayContaining([
        jasmine.objectContaining({ text: 'Ver diagnósticos', href: '/analysis?fieldId=field-1' }),
        jasmine.objectContaining({ text: 'Ver lotes', href: '/lots?fieldId=field-1' }),
        jasmine.objectContaining({ text: 'Ver programados', href: '/scheduled-analysis?fieldId=field-1' }),
      ]),
    );
  });

  it('el link "Volver a Campos" funciona (18)', () => {
    setup();
    const el = fixture.nativeElement as HTMLElement;
    const backLink = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
      a.textContent?.includes('Volver a Campos'),
    );

    expect(backLink?.getAttribute('href')).toBe('/fields');
  });

  it('no muestra undefined/null/NaN con datos completos (19)', () => {
    setup({
      detail: buildDetail({
        field: {
          ...buildDetail().field,
          analysisStatus: 'attention',
          requiresAttention: true,
        },
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
          keyFindings: ['Hallazgo 1'],
          possibleCauses: [],
          recommendations: ['Recomendación 1'],
          limitations: ['Limitación 1'],
          generatedAt: '2026-08-10T01:05:00.000Z',
          generator: 'deterministic-v1',
          promptVersion: null,
          errorMessage: null,
        },
        lots: [
          { id: 'lot-1', name: 'Lote 1', createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z' },
        ],
        analyses: [
          {
            id: 'analysis-1',
            status: 'Finalizado',
            createdAt: '2026-08-10T00:00:00.000Z',
            completedAt: '2026-08-10T01:00:00.000Z',
            durationMs: 4000,
            score: 41,
            errorMessage: null,
            reviewedAt: '2026-08-11T00:00:00.000Z',
            reviewedByUserId: 'user-2',
          },
        ],
        weeklyMonitoring: {
          active: true,
          scheduleId: 'schedule-1',
          frequency: 'weekly',
          nextRunAt: '2026-09-01T09:00:00.000Z',
          lastRunAt: '2026-08-24T09:00:00.000Z',
          hasRuns: true,
        },
        scheduledRuns: [
          {
            id: 'run-1',
            status: 'completed',
            scheduledFor: '2026-08-24',
            analysisId: 'analysis-9',
            analysisStatus: 'Finalizado',
            startedAt: '2026-08-24T09:00:00.000Z',
            completedAt: '2026-08-24T09:05:00.000Z',
            failedAt: null,
            emailSentAt: '2026-08-24T09:10:00.000Z',
            errorMessage: null,
            createdAt: '2026-08-24T09:00:00.000Z',
            updatedAt: '2026-08-24T09:10:00.000Z',
            weeklyTechnicalVerdict: {
              status: 'generated',
              verdict: 'favorable',
              trend: 'stable',
              confidence: 'medium',
              summary: 'Sin cambios relevantes.',
              keyChanges: [],
              areasToReview: [],
              recommendations: [],
              limitations: [],
              previousSnapshotId: null,
              generatedAt: '2026-08-24T09:12:00.000Z',
              generator: 'deterministic-v1',
              promptVersion: null,
              errorMessage: null,
            },
          },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('undefined');
    expect(el.textContent).not.toContain('null');
    expect(el.textContent).not.toContain('NaN');
  });
});
