import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminAnalysis, AnalysisTechnicalVerdict } from '../../core/models/analysis.model';
import { PaginatedResult } from '../../core/models/pagination.model';
import { AnalysisService } from '../../core/services/analysis.service';
import { UsersService } from '../../core/services/users.service';
import { AnalysisComponent } from './analysis.component';

function buildAnalysis(overrides: Partial<AdminAnalysis> = {}): AdminAnalysis {
  return {
    id: 'analysis-1',
    fieldId: 'field-1',
    fieldName: 'Campo Norte',
    ownerId: 'user-1',
    ownerEmail: 'owner@example.com',
    ownerFullName: 'Owner Test',
    status: 'Error',
    startedAt: '2026-08-01T10:00:00.000Z',
    completedAt: null,
    failedAt: '2026-08-01T10:05:00.000Z',
    durationMs: 300000,
    errorMessage: null,
    reviewedAt: null,
    reviewedByUserId: null,
    retryCount: 0,
    lastRetriedAt: null,
    createdAt: '2026-08-01T09:59:00.000Z',
    ...overrides,
  };
}

function buildTechnicalVerdict(overrides: Partial<AnalysisTechnicalVerdict> = {}): AnalysisTechnicalVerdict {
  return {
    status: 'generated',
    verdict: 'attention',
    confidence: 'medium',
    summary: 'El campo muestra variabilidad relevante entre zonas.',
    keyFindings: ['Zona Alta concentra la mayor superficie del campo.'],
    possibleCauses: [],
    recommendations: ['Revisar riego diferencial en los sectores de menor respuesta.'],
    limitations: ['Cobertura satelital parcial en el período analizado.'],
    generatedAt: '2026-08-26T01:40:38.000Z',
    generator: 'claude',
    promptVersion: 'technical-verdict-v1',
    errorMessage: null,
    ...overrides,
  };
}

function buildResult(items: AdminAnalysis[]): PaginatedResult<AdminAnalysis> {
  return { items, total: items.length, page: 1, limit: 20 };
}

describe('AnalysisComponent', () => {
  let fixture: ComponentFixture<AnalysisComponent>;
  let analysisServiceSpy: jasmine.SpyObj<AnalysisService>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;

  function setup(items: AdminAnalysis[]): void {
    analysisServiceSpy.list.and.returnValue(of(buildResult(items)));

    fixture = TestBed.createComponent(AnalysisComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    analysisServiceSpy = jasmine.createSpyObj('AnalysisService', ['list', 'markReviewed', 'retry']);
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['list']);
    usersServiceSpy.list.and.returnValue(of({ items: [], total: 0, page: 1, limit: 100 }));

    TestBed.configureTestingModule({
      imports: [AnalysisComponent],
      providers: [
        { provide: AnalysisService, useValue: analysisServiceSpy },
        { provide: UsersService, useValue: usersServiceSpy },
      ],
    });
  });

  it('shows a truncated error by default and reveals the full message on "Ver error completo"', () => {
    const longError =
      'Earth Engine timeout: no se pudo completar la consulta de imágenes satelitales para el rango de fechas solicitado tras 3 reintentos internos.';
    setup([buildAnalysis({ errorMessage: longError })]);

    const el = fixture.nativeElement as HTMLElement;
    const cell = el.querySelector('.error-cell') as HTMLElement;
    expect(cell.textContent).toContain(longError);
    expect(cell.classList).not.toContain('error-cell--expanded');

    const toggle = cell.querySelector('button') as HTMLButtonElement;
    expect(toggle.textContent?.trim()).toBe('Ver error completo');

    toggle.click();
    fixture.detectChanges();

    expect(cell.classList).toContain('error-cell--expanded');
    expect(toggle.textContent?.trim()).toBe('Ocultar');
  });

  it('shows "Sin error registrado" and no toggle button when the analysis has no error', () => {
    setup([buildAnalysis({ status: 'Finalizado', errorMessage: null })]);

    const el = fixture.nativeElement as HTMLElement;
    const cell = el.querySelector('.error-cell') as HTMLElement;

    expect(cell.textContent).toContain('Sin error registrado');
    expect(cell.querySelector('button')).toBeNull();
  });

  it('renders "Procesando" with the info (blue/indigo) tone, not the warning tone used elsewhere', () => {
    setup([buildAnalysis({ status: 'Procesando', errorMessage: null })]);

    const el = fixture.nativeElement as HTMLElement;
    const badge = el.querySelector('app-status-badge .badge');

    expect(badge?.classList).toContain('badge--info');
    expect(badge?.classList).not.toContain('badge--warning');
  });

  it('expands and collapses each row error independently without affecting other rows', () => {
    setup([
      buildAnalysis({ id: 'a1', errorMessage: 'Error corto A' }),
      buildAnalysis({ id: 'a2', errorMessage: 'Error corto B' }),
    ]);

    const el = fixture.nativeElement as HTMLElement;
    const cells = el.querySelectorAll('.error-cell');
    const firstToggle = cells[0].querySelector('button') as HTMLButtonElement;

    firstToggle.click();
    fixture.detectChanges();

    expect(cells[0].classList).toContain('error-cell--expanded');
    expect(cells[1].classList).not.toContain('error-cell--expanded');
  });

  describe('Veredicto técnico (PR 13A)', () => {
    function expandVerdict(el: HTMLElement): void {
      const toggle = el.querySelector('.verdict-cell button') as HTMLButtonElement;
      toggle.click();
      fixture.detectChanges();
    }

    it('renderiza "Veredicto técnico" y su contenido cuando status=generated', () => {
      setup([buildAnalysis({ technicalVerdict: buildTechnicalVerdict() })]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      const panel = el.querySelector('.verdict-panel') as HTMLElement;
      expect(panel).toBeTruthy();
      expect(panel.textContent).toContain('Veredicto técnico');
    });

    it('renderiza el summary', () => {
      setup([buildAnalysis({ technicalVerdict: buildTechnicalVerdict({ summary: 'Resumen de prueba.' }) })]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      expect((el.querySelector('.verdict-panel') as HTMLElement).textContent).toContain('Resumen de prueba.');
    });

    it('renderiza keyFindings', () => {
      setup([
        buildAnalysis({
          technicalVerdict: buildTechnicalVerdict({ keyFindings: ['Hallazgo uno', 'Hallazgo dos'] }),
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      const text = (el.querySelector('.verdict-panel') as HTMLElement).textContent ?? '';
      expect(text).toContain('Hallazgos principales');
      expect(text).toContain('Hallazgo uno');
      expect(text).toContain('Hallazgo dos');
    });

    it('renderiza possibleCauses', () => {
      setup([
        buildAnalysis({
          technicalVerdict: buildTechnicalVerdict({ possibleCauses: ['Baja disponibilidad hídrica.'] }),
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      const text = (el.querySelector('.verdict-panel') as HTMLElement).textContent ?? '';
      expect(text).toContain('Posibles causas');
      expect(text).toContain('Baja disponibilidad hídrica.');
    });

    it('renderiza recommendations', () => {
      setup([
        buildAnalysis({
          technicalVerdict: buildTechnicalVerdict({ recommendations: ['Revisar riego en sector sur.'] }),
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      const text = (el.querySelector('.verdict-panel') as HTMLElement).textContent ?? '';
      expect(text).toContain('Recomendaciones');
      expect(text).toContain('Revisar riego en sector sur.');
    });

    it('renderiza limitations', () => {
      setup([
        buildAnalysis({
          technicalVerdict: buildTechnicalVerdict({ limitations: ['Cobertura satelital parcial.'] }),
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      const text = (el.querySelector('.verdict-panel') as HTMLElement).textContent ?? '';
      expect(text).toContain('Limitaciones');
      expect(text).toContain('Cobertura satelital parcial.');
    });

    it('mapea verdict attention → "Requiere atención"', () => {
      setup([buildAnalysis({ technicalVerdict: buildTechnicalVerdict({ verdict: 'attention' }) })]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      expect((el.querySelector('.verdict-panel') as HTMLElement).textContent).toContain('Requiere atención');
    });

    it('mapea confidence medium → "Media"', () => {
      setup([buildAnalysis({ technicalVerdict: buildTechnicalVerdict({ confidence: 'medium' }) })]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      expect((el.querySelector('.verdict-panel') as HTMLElement).textContent).toContain('Confianza: Media');
    });

    it('muestra generator, promptVersion y generatedAt — campos internos permitidos en admin', () => {
      setup([
        buildAnalysis({
          technicalVerdict: buildTechnicalVerdict({
            generator: 'claude',
            promptVersion: 'technical-verdict-v1',
            generatedAt: '2026-08-26T01:40:38.000Z',
          }),
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      const text = (el.querySelector('.verdict-panel') as HTMLElement).textContent ?? '';
      expect(text).toContain('Generator: claude');
      expect(text).toContain('Prompt version: technical-verdict-v1');
      expect(text).toContain('Generated at:');
    });

    it('technicalVerdict failed muestra el errorMessage en "Error técnico"', () => {
      setup([
        buildAnalysis({
          technicalVerdict: buildTechnicalVerdict({
            status: 'failed',
            errorMessage: 'Claude rechazó la API key configurada (401).',
          }),
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      const text = (el.querySelector('.verdict-panel') as HTMLElement).textContent ?? '';
      expect(text).toContain('Error técnico');
      expect(text).toContain('Claude rechazó la API key configurada (401).');
    });

    it('technicalVerdict null/undefined muestra "No disponible" y no rompe la fila', () => {
      setup([
        buildAnalysis({ id: 'a1', technicalVerdict: null }),
        buildAnalysis({ id: 'a2', technicalVerdict: undefined }),
      ]);
      const el = fixture.nativeElement as HTMLElement;
      const cells = el.querySelectorAll('.verdict-cell');

      expect(cells[0].textContent).toContain('No disponible');
      expect(cells[0].querySelector('button')).toBeNull();
      expect(cells[1].textContent).toContain('No disponible');
      expect(cells[1].querySelector('button')).toBeNull();
    });

    it('no rompe si los arrays vienen vacíos, y no muestra subtítulos de listas vacías', () => {
      setup([
        buildAnalysis({
          technicalVerdict: buildTechnicalVerdict({
            keyFindings: [],
            possibleCauses: [],
            recommendations: [],
            limitations: [],
          }),
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      const text = (el.querySelector('.verdict-panel') as HTMLElement).textContent ?? '';
      expect(text).not.toContain('Hallazgos principales');
      expect(text).not.toContain('Posibles causas');
      expect(text).not.toContain('Recomendaciones');
      expect(text).not.toContain('Limitaciones');
    });

    it('no muestra "undefined"/"null" como texto visible cuando generator/promptVersion/generatedAt son null', () => {
      setup([
        buildAnalysis({
          technicalVerdict: buildTechnicalVerdict({
            generator: null,
            promptVersion: null,
            generatedAt: null,
          }),
        }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expandVerdict(el);

      const text = (el.querySelector('.verdict-panel') as HTMLElement).textContent ?? '';
      expect(text).not.toContain('undefined');
      expect(text).not.toContain('null');
      expect(text).toContain('Generator: —');
      expect(text).toContain('Prompt version: —');
      expect(text).toContain('Generated at: —');
    });

    it('el toggle "Ver detalle" expande y colapsa de forma independiente por fila', () => {
      setup([
        buildAnalysis({ id: 'a1', technicalVerdict: buildTechnicalVerdict() }),
        buildAnalysis({ id: 'a2', technicalVerdict: buildTechnicalVerdict() }),
      ]);
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.verdict-panel').length).toBe(0);

      const firstToggle = el.querySelectorAll('.verdict-cell button')[0] as HTMLButtonElement;
      firstToggle.click();
      fixture.detectChanges();

      expect(el.querySelectorAll('.verdict-panel').length).toBe(1);
      expect(firstToggle.textContent?.trim()).toBe('Ocultar');
    });
  });
});
