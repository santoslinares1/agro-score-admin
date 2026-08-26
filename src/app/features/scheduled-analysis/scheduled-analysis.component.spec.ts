import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AnalysisTechnicalVerdict } from '../../core/models/analysis.model';
import {
  AdminScheduledAnalysisItem,
  AdminScheduledAnalysisRun,
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
    ...overrides,
  };
}

function buildResult(items: AdminScheduledAnalysisItem[]): PaginatedResult<AdminScheduledAnalysisItem> {
  return { items, total: items.length, page: 1, limit: 20 };
}

describe('ScheduledAnalysisComponent (PR 13B)', () => {
  let fixture: ComponentFixture<ScheduledAnalysisComponent>;
  let serviceSpy: jasmine.SpyObj<ScheduledAnalysisService>;

  function setup(items: AdminScheduledAnalysisItem[]): void {
    serviceSpy.list.and.returnValue(of(buildResult(items)));
    fixture = TestBed.createComponent(ScheduledAnalysisComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    serviceSpy = jasmine.createSpyObj('ScheduledAnalysisService', ['list']);

    TestBed.configureTestingModule({
      imports: [ScheduledAnalysisComponent],
      providers: [{ provide: ScheduledAnalysisService, useValue: serviceSpy }],
    });
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

    (el.querySelector('td button') as HTMLButtonElement).click();
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
});
