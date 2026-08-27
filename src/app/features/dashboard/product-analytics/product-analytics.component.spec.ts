import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import {
  AdminProductAnalytics,
  ProductAnalyticsFunnelStage,
  ProductAnalyticsInsight,
} from '../../../core/models/product-analytics.model';
import { ProductAnalyticsService } from '../../../core/services/product-analytics.service';
import { ProductAnalyticsComponent } from './product-analytics.component';

function buildStage(overrides: Partial<ProductAnalyticsFunnelStage> = {}): ProductAnalyticsFunnelStage {
  return {
    id: 'total-users',
    label: 'Usuarios totales',
    count: 10,
    ...overrides,
  };
}

function buildInsight(overrides: Partial<ProductAnalyticsInsight> = {}): ProductAnalyticsInsight {
  return {
    id: 'fields-without-analysis',
    severity: 'warning',
    title: '59 de 78 campos todavía no tienen ningún diagnóstico',
    description: 'Principal punto de pérdida: activación del primer análisis.',
    route: '/fields',
    queryParams: { hasAnalysis: false },
    ...overrides,
  };
}

function buildAnalytics(overrides: Partial<AdminProductAnalytics> = {}): AdminProductAnalytics {
  return {
    generatedAt: new Date().toISOString(),
    funnel: [],
    insights: [],
    weeklyMonitoring: {
      totalFields: 0,
      activeSchedules: 0,
      activeSchedulesWithoutRuns: 0,
      schedulesWithRuns: 0,
      sentEmails: 0,
    },
    topAnalysisErrorsLast30Days: [],
    ...overrides,
  };
}

describe('ProductAnalyticsComponent (Admin PR 4)', () => {
  function createComponent(
    config: {
      analytics?: AdminProductAnalytics;
      error?: boolean;
      pending?: Subject<AdminProductAnalytics>;
    } = {},
  ): ComponentFixture<ProductAnalyticsComponent> {
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
      providers: [provideRouter([]), { provide: ProductAnalyticsService, useValue: spy }],
    });

    const fixture = TestBed.createComponent(ProductAnalyticsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza la sección "Embudo de uso"', () => {
    const fixture = createComponent();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Embudo de uso');
  });

  it('muestra el estado de carga mientras la respuesta no llegó, sin romper el resto del dashboard', () => {
    const pending = new Subject<AdminProductAnalytics>();
    const fixture = createComponent({ pending });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.loading-state')?.textContent).toContain('Cargando');
    expect(el.querySelector('.error-banner')).toBeFalsy();
  });

  it('muestra un mensaje de error si la llamada falla, sin lanzar una excepción', () => {
    expect(() => {
      const fixture = createComponent({ error: true });
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.error-banner')?.textContent).toContain(
        'No se pudieron cargar las métricas de producto.',
      );
    }).not.toThrow();
  });

  it('renderiza las 9 etapas del funnel recibidas, con count/label', () => {
    const fixture = createComponent({
      analytics: buildAnalytics({
        funnel: [
          buildStage({ id: 'total-users', label: 'Usuarios totales', count: 10 }),
          buildStage({
            id: 'total-fields',
            label: 'Campos totales',
            count: 78,
            previousCount: 10,
            dropoffFromPrevious: -68,
          }),
          buildStage({
            id: 'fields-with-finalized-analysis',
            label: 'Campos con al menos un análisis finalizado',
            count: 19,
            previousCount: 78,
            conversionFromPrevious: 19 / 78,
            dropoffFromPrevious: 59,
          }),
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;
    const stages = el.querySelectorAll('.pa-funnel__stage');

    expect(stages.length).toBe(3);
    expect(stages[2].textContent).toContain('Campos con al menos un análisis finalizado');
    expect(stages[2].textContent).toContain('19');
  });

  it('renderiza porcentaje y caída de cada etapa (ejemplo: 24% / caída -59)', () => {
    const fixture = createComponent({
      analytics: buildAnalytics({
        funnel: [
          buildStage({ id: 'total-fields', label: 'Campos totales', count: 78 }),
          buildStage({
            id: 'fields-with-finalized-analysis',
            label: 'Campos con análisis finalizado',
            count: 19,
            previousCount: 78,
            conversionFromPrevious: 19 / 78,
            dropoffFromPrevious: 59,
          }),
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;
    const secondStage = el.querySelectorAll('.pa-funnel__stage')[1];

    expect(secondStage.textContent).toContain('24.4%');
    expect(secondStage.textContent).toContain('Caída: -59');
  });

  it('no divide por cero: previousCount=0 no muestra NaN/Infinity, solo omite el porcentaje', () => {
    const fixture = createComponent({
      analytics: buildAnalytics({
        funnel: [
          buildStage({ id: 'total-users', label: 'Usuarios totales', count: 0 }),
          buildStage({
            id: 'users-with-field',
            label: 'Usuarios con campo',
            count: 0,
            previousCount: 0,
            conversionFromPrevious: undefined,
            dropoffFromPrevious: 0,
          }),
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('NaN');
    expect(el.textContent).not.toContain('Infinity');
    expect(el.textContent).not.toContain('undefined');
    expect(el.textContent).not.toContain('null');
  });

  it('muestra el estado vacío del funnel/insights/errores cuando no hay datos', () => {
    const fixture = createComponent({ analytics: buildAnalytics() });
    const el = fixture.nativeElement as HTMLElement;
    const emptyStates = el.querySelectorAll('.empty-state');

    expect(emptyStates.length).toBeGreaterThanOrEqual(3); // funnel, insights, errores
  });

  it('renderiza "Qué mirar" con los insights determinísticos recibidos', () => {
    const fixture = createComponent({
      analytics: buildAnalytics({ insights: [buildInsight()] }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Qué mirar');
    const card = el.querySelector('.insight-card') as HTMLElement;
    expect(card.textContent).toContain('59 de 78 campos todavía no tienen ningún diagnóstico');
    expect(card.classList).toContain('insight-card--warning');
  });

  it('cada insight con route arma un link real con sus queryParams', () => {
    const fixture = createComponent({
      analytics: buildAnalytics({
        insights: [
          buildInsight({
            route: '/analysis',
            queryParams: { status: 'Error' },
            title: '25 diagnósticos fallidos en los últimos 30 días',
          }),
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;
    const cta = el.querySelector('.insight-card__action') as HTMLAnchorElement;

    expect(cta.getAttribute('href')).toBe('/analysis?status=Error');
  });

  it('el bloque de monitoreo semanal linkea a Programados (activos y sin corridas)', () => {
    const fixture = createComponent({
      analytics: buildAnalytics({
        weeklyMonitoring: {
          totalFields: 78,
          activeSchedules: 2,
          activeSchedulesWithoutRuns: 1,
          schedulesWithRuns: 1,
          sentEmails: 4,
        },
      }),
    });
    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.pa-monitoring__actions a'));

    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/scheduled-analysis?enabled=true',
      '/scheduled-analysis?enabled=true&hasRuns=false',
    ]);
    expect(el.textContent).toContain('78');
    expect(el.textContent).toContain('4');
  });

  it('renderiza el top de errores frecuentes (hasta 3) con link a diagnósticos fallidos', () => {
    const fixture = createComponent({
      analytics: buildAnalytics({
        topAnalysisErrorsLast30Days: [
          { message: 'Timeout worker', count: 12 },
          { message: 'Nubosidad excesiva', count: 5 },
          { message: 'Sin imágenes disponibles', count: 2 },
        ],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('table tbody tr');

    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Timeout worker');
    expect(rows[0].textContent).toContain('12');

    const cta = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
      a.textContent?.includes('Ver diagnósticos fallidos'),
    );
    expect(cta?.getAttribute('href')).toBe('/analysis?status=Error');
  });

  it('nunca muestra undefined/null/NaN en toda la sección con datos completos', () => {
    const fixture = createComponent({
      analytics: buildAnalytics({
        funnel: [buildStage()],
        insights: [buildInsight()],
        topAnalysisErrorsLast30Days: [{ message: 'Timeout worker', count: 3 }],
      }),
    });
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('undefined');
    expect(el.textContent).not.toContain('null');
    expect(el.textContent).not.toContain('NaN');
  });
});
