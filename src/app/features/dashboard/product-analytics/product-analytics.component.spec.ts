import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { AdminProductAnalytics } from '../../../core/models/product-analytics.model';
import { ProductAnalyticsService } from '../../../core/services/product-analytics.service';
import { ProductAnalyticsComponent } from './product-analytics.component';

const WEEK = { weekStart: '2026-08-31', weekEnd: '2026-09-06' };
const NEXT_WEEK = { weekStart: '2026-09-07', weekEnd: '2026-09-13' };

function buildAnalytics(overrides: Partial<AdminProductAnalytics> = {}): AdminProductAnalytics {
  return {
    generatedAt: new Date().toISOString(),
    period: { week: WEEK, timezone: 'America/Argentina/Cordoba' },
    coverage: {
      scheduleHistory: { availableFrom: '2026-08-01T00:00:00.000Z', complete: true },
      analysisClassificationScan: { scanned: 0, limit: 5000, truncated: false },
      nonCanonicalSchedules: { count: 0 },
    },
    northStar: { week: WEEK, usableFieldsCount: 0, eligibleFieldsCount: 0, rate: null },
    activation: { eligibleUsersCount: 0, activatedUsersCount: 0, rate: null },
    timeToFirstTechnicalValue: {
      cohortUsersCount: 0,
      activatedUsersCount: 0,
      notActivatedUsersCount: 0,
      p50Hours: null,
      p75Hours: null,
      p95Hours: null,
    },
    retention: {
      week: WEEK,
      nextWeek: NEXT_WEEK,
      periodComplete: true,
      sufficientInWeekCount: 0,
      retainedInNextWeekCount: 0,
      rate: null,
    },
    qualityBreakdown: {
      week: WEEK,
      totalSnapshots: 0,
      breakdown: [
        { status: 'sufficient', count: 0, proportion: null },
        { status: 'partial', count: 0, proportion: null },
        { status: 'insufficient', count: 0, proportion: null },
      ],
    },
    ...overrides,
  };
}

describe('ProductAnalyticsComponent (KPIs P0)', () => {
  function createComponent(
    config: {
      analytics?: AdminProductAnalytics;
      error?: boolean;
      pending?: Subject<AdminProductAnalytics>;
    } = {},
  ): { fixture: ComponentFixture<ProductAnalyticsComponent>; spy: jasmine.SpyObj<ProductAnalyticsService> } {
    const spy: jasmine.SpyObj<ProductAnalyticsService> = jasmine.createSpyObj('ProductAnalyticsService', [
      'getProductAnalytics',
    ]);

    if (config.pending) {
      spy.getProductAnalytics.and.returnValue(config.pending.asObservable());
    } else if (config.error) {
      spy.getProductAnalytics.and.returnValue(throwError(() => new Error('boom')));
    } else {
      spy.getProductAnalytics.and.returnValue(of(config.analytics ?? buildAnalytics()));
    }

    TestBed.configureTestingModule({
      imports: [ProductAnalyticsComponent],
      providers: [{ provide: ProductAnalyticsService, useValue: spy }],
    });

    const fixture = TestBed.createComponent(ProductAnalyticsComponent);
    fixture.detectChanges();
    return { fixture, spy };
  }

  it('renderiza la sección "Entrega técnica"', () => {
    const { fixture } = createComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Entrega técnica');
  });

  it('nunca dice "valor real" — usa "entrega técnica" / "resultado técnicamente utilizable"', () => {
    const { fixture } = createComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('valor real');
  });

  it('muestra el estado de carga mientras la respuesta no llegó, sin romper el resto del dashboard', () => {
    const pending = new Subject<AdminProductAnalytics>();
    const { fixture } = createComponent({ pending });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.loading-state')?.textContent).toContain('Cargando');
    expect(el.querySelector('.error-banner')).toBeFalsy();
  });

  it('muestra un mensaje de error si la llamada falla, sin lanzar una excepción', () => {
    expect(() => {
      const { fixture } = createComponent({ error: true });
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.error-banner')?.textContent).toContain(
        'No se pudieron cargar las métricas de producto.',
      );
    }).not.toThrow();
  });

  it('pide la última semana completa por default (sin `week`)', () => {
    const { spy } = createComponent();
    expect(spy.getProductAnalytics).toHaveBeenCalledWith(undefined);
  });

  describe('North Star', () => {
    it('muestra numerador, denominador y rate juntos', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          northStar: { week: WEEK, usableFieldsCount: 3, eligibleFieldsCount: 5, rate: 3 / 5 },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('3 / 5');
      expect(el.textContent).toContain('60.0%');
    });

    it('denominador 0: muestra un estado explícito, nunca un porcentaje engañoso', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          northStar: { week: WEEK, usableFieldsCount: 0, eligibleFieldsCount: 0, rate: null },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('sin denominador');
      expect(el.textContent).not.toContain('NaN');
      expect(el.textContent).not.toContain('Infinity');
    });
  });

  describe('Retención', () => {
    it('período completo: renderiza numerador, denominador y rate normalmente', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          retention: {
            week: WEEK,
            nextWeek: NEXT_WEEK,
            periodComplete: true,
            sufficientInWeekCount: 4,
            retainedInNextWeekCount: 2,
            rate: 0.5,
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('2 / 4');
      expect(el.textContent).toContain('50.0%');
      expect(el.textContent).not.toContain('Todavía no disponible');
    });

    it('período incompleto (N+1 en curso o futura): estado explícito, nunca 0% ni un rate', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          retention: {
            week: WEEK,
            nextWeek: NEXT_WEEK,
            periodComplete: false,
            sufficientInWeekCount: 3,
            retainedInNextWeekCount: 1,
            rate: null,
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Todavía no disponible');
      expect(el.textContent).not.toContain('0%');
      expect(el.textContent).not.toContain('0.0%');
      // Los conteos parciales reales sí pueden mostrarse como contexto — nunca el rate.
      expect(el.textContent).toContain('1');
      expect(el.textContent).toContain('3');
    });

    it('período incompleto sin datos parciales todavía: no aparece 0% en ningún lado', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          retention: {
            week: WEEK,
            nextWeek: NEXT_WEEK,
            periodComplete: false,
            sufficientInWeekCount: 0,
            retainedInNextWeekCount: 0,
            rate: null,
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Todavía no disponible');
      expect(el.textContent).not.toContain('0%');
    });
  });

  describe('cobertura', () => {
    it('historial de schedules incompleto: muestra la nota, nunca la oculta', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          coverage: {
            scheduleHistory: { availableFrom: null, complete: false },
            analysisClassificationScan: { scanned: 0, limit: 5000, truncated: false },
            nonCanonicalSchedules: { count: 0 },
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;
      const notes = el.querySelectorAll('.pa-coverage-note');

      expect(notes.length).toBeGreaterThanOrEqual(1);
      expect(Array.from(notes).some((n) => n.textContent?.includes('histórico'))).toBe(true);
    });

    it('scan de activation truncado: muestra la nota con scanned/limit', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          coverage: {
            scheduleHistory: { availableFrom: '2026-01-01T00:00:00.000Z', complete: true },
            analysisClassificationScan: { scanned: 5000, limit: 5000, truncated: true },
            nonCanonicalSchedules: { count: 0 },
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;
      const notes = el.querySelectorAll('.pa-coverage-note');

      expect(Array.from(notes).some((n) => n.textContent?.includes('5000'))).toBe(true);
    });

    it('sin cobertura incompleta: no muestra ninguna nota', () => {
      const { fixture } = createComponent({ analytics: buildAnalytics() });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.pa-coverage-note').length).toBe(0);
    });

    it('schedules no canónicos > 0: muestra la advertencia, nunca la presenta como error de procesamiento', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          coverage: {
            scheduleHistory: { availableFrom: '2026-01-01T00:00:00.000Z', complete: true },
            analysisClassificationScan: { scanned: 0, limit: 5000, truncated: false },
            nonCanonicalSchedules: { count: 3 },
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;
      const notes = Array.from(el.querySelectorAll('.pa-coverage-note'));

      expect(notes.some((n) => n.textContent?.includes('3'))).toBe(true);
      expect(notes.some((n) => n.textContent?.includes('cutoff canónico'))).toBe(true);
      // Nunca con severidad de error — es una nota informativa (.pa-coverage-note), no un fallo.
      expect(el.querySelector('.error-banner')).toBeFalsy();
    });

    it('cero schedules no canónicos: no muestra la advertencia', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          coverage: {
            scheduleHistory: { availableFrom: '2026-01-01T00:00:00.000Z', complete: true },
            analysisClassificationScan: { scanned: 0, limit: 5000, truncated: false },
            nonCanonicalSchedules: { count: 0 },
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.pa-coverage-note').length).toBe(0);
    });

    it('un solo schedule no canónico: usa singular ("tiene"), no plural', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          coverage: {
            scheduleHistory: { availableFrom: '2026-01-01T00:00:00.000Z', complete: true },
            analysisClassificationScan: { scanned: 0, limit: 5000, truncated: false },
            nonCanonicalSchedules: { count: 1 },
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('1 monitoreo semanal tiene');
      expect(el.textContent).not.toContain('monitoreos semanales tienen');
    });
  });

  describe('Breakdown de calidad', () => {
    it('conserva las tres categorías, incluso en 0', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          qualityBreakdown: {
            week: WEEK,
            totalSnapshots: 5,
            breakdown: [
              { status: 'sufficient', count: 5, proportion: 1 },
              { status: 'partial', count: 0, proportion: 0 },
              { status: 'insufficient', count: 0, proportion: 0 },
            ],
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;
      const rows = el.querySelectorAll('table tbody tr');

      expect(rows.length).toBe(3);
      expect(el.textContent).toContain('Sufficient');
      expect(el.textContent).toContain('Partial');
      expect(el.textContent).toContain('Insufficient');
    });

    it('nunca usa la palabra "error" para partial/insufficient', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          qualityBreakdown: {
            week: WEEK,
            totalSnapshots: 3,
            breakdown: [
              { status: 'sufficient', count: 1, proportion: 1 / 3 },
              { status: 'partial', count: 1, proportion: 1 / 3 },
              { status: 'insufficient', count: 1, proportion: 1 / 3 },
            ],
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent?.toLowerCase()).not.toContain('error');
    });

    it('cero snapshots: estado vacío explícito', () => {
      const { fixture } = createComponent({ analytics: buildAnalytics() });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('.empty-state')?.textContent).toContain('Todavía no hay snapshots');
    });
  });

  describe('Time to First Technical Value', () => {
    it('muestra cohortUsersCount/activatedUsersCount/notActivatedUsersCount y percentiles', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          timeToFirstTechnicalValue: {
            cohortUsersCount: 10,
            activatedUsersCount: 4,
            notActivatedUsersCount: 6,
            p50Hours: 30,
            p75Hours: 40,
            p95Hours: null,
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('10');
      expect(el.textContent).toContain('4');
      expect(el.textContent).toContain('6');
      expect(el.textContent).toContain('30.0 h');
      expect(el.textContent).toContain('40.0 h');
    });

    it('p95 null con usuarios activados: explica "volumen insuficiente", no lo deja vacío en silencio', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          timeToFirstTechnicalValue: {
            cohortUsersCount: 3,
            activatedUsersCount: 3,
            notActivatedUsersCount: 0,
            p50Hours: 10,
            p75Hours: 10,
            p95Hours: null,
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Volumen insuficiente');
    });

    it('formatea horas >= 48 en días', () => {
      const { fixture } = createComponent({
        analytics: buildAnalytics({
          timeToFirstTechnicalValue: {
            cohortUsersCount: 1,
            activatedUsersCount: 1,
            notActivatedUsersCount: 0,
            p50Hours: 96,
            p75Hours: 96,
            p95Hours: null,
          },
        }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('4.0 días');
    });
  });

  describe('navegación de semana', () => {
    it('"Semana anterior" pide la semana calendario 7 días antes, y vuelve a llamar al servicio', () => {
      const { fixture, spy } = createComponent({ analytics: buildAnalytics() });
      spy.getProductAnalytics.calls.reset();
      spy.getProductAnalytics.and.returnValue(of(buildAnalytics()));

      const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
        (b as HTMLButtonElement).textContent?.includes('Semana anterior'),
      ) as HTMLButtonElement;
      button.click();

      expect(spy.getProductAnalytics).toHaveBeenCalledWith('2026-08-24');
    });

    it('nunca calcula la semana en el frontend: siempre refleja period.week de la respuesta', () => {
      const customWeek = { weekStart: '2026-01-05', weekEnd: '2026-01-11' };
      const { fixture } = createComponent({
        analytics: buildAnalytics({ period: { week: customWeek, timezone: 'UTC' } }),
      });
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('2026-01-05');
      expect(el.textContent).toContain('2026-01-11');
    });
  });

  it('nunca muestra undefined/null/NaN en toda la sección con datos completos', () => {
    const { fixture } = createComponent({
      analytics: buildAnalytics({
        northStar: { week: WEEK, usableFieldsCount: 3, eligibleFieldsCount: 5, rate: 3 / 5 },
        activation: { eligibleUsersCount: 5, activatedUsersCount: 2, rate: 2 / 5 },
        retention: {
          week: WEEK,
          nextWeek: NEXT_WEEK,
          periodComplete: true,
          sufficientInWeekCount: 4,
          retainedInNextWeekCount: 1,
          rate: 1 / 4,
        },
        timeToFirstTechnicalValue: {
          cohortUsersCount: 5,
          activatedUsersCount: 2,
          notActivatedUsersCount: 3,
          p50Hours: 20,
          p75Hours: 40,
          p95Hours: null,
        },
        qualityBreakdown: {
          week: WEEK,
          totalSnapshots: 3,
          breakdown: [
            { status: 'sufficient', count: 2, proportion: 2 / 3 },
            { status: 'partial', count: 1, proportion: 1 / 3 },
            { status: 'insufficient', count: 0, proportion: 0 },
          ],
        },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('undefined');
    expect(el.textContent).not.toContain('null');
    expect(el.textContent).not.toContain('NaN');
  });
});
