import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AdminMetrics } from '../../core/models/metrics.model';
import { AdminProductAnalytics } from '../../core/models/product-analytics.model';
import { MetricsService } from '../../core/services/metrics.service';
import { ProductAnalyticsService } from '../../core/services/product-analytics.service';
import { DashboardComponent } from './dashboard.component';

function buildMetrics(overrides: Partial<AdminMetrics> = {}): AdminMetrics {
  return {
    totalUsers: 10,
    activeUsers: 8,
    totalFields: 5,
    totalLots: 12,
    totalAnalysis: 20,
    completedAnalysis: 12,
    failedAnalysis: 3,
    averageAnalysisDurationMs: 45000,
    latestAnalysis: [],
    latestAccessRequests: [],
    ...overrides,
  };
}

// Admin PR 4: app-product-analytics (dentro del Dashboard) inyecta su propio
// ProductAnalyticsService — sin este mock, TestBed intenta resolver HttpClient real. Todos los
// tests de este describe usan el mismo fixture "vacío": lo que le pasa a product-analytics no es
// lo que están cubriendo, eso vive en product-analytics.component.spec.ts.
function buildEmptyProductAnalytics(): AdminProductAnalytics {
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
  };
}

describe('DashboardComponent', () => {
  function createComponent(metrics: AdminMetrics): ComponentFixture<DashboardComponent> {
    const metricsServiceSpy: jasmine.SpyObj<MetricsService> = jasmine.createSpyObj('MetricsService', [
      'getMetrics',
    ]);
    metricsServiceSpy.getMetrics.and.returnValue(of(metrics));

    const productAnalyticsServiceSpy: jasmine.SpyObj<ProductAnalyticsService> = jasmine.createSpyObj(
      'ProductAnalyticsService',
      ['getProductAnalytics'],
    );
    productAnalyticsServiceSpy.getProductAnalytics.and.returnValue(of(buildEmptyProductAnalytics()));

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: MetricsService, useValue: metricsServiceSpy },
        { provide: ProductAnalyticsService, useValue: productAnalyticsServiceSpy },
      ],
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return fixture;
  }

  function processingCardValue(fixture: ComponentFixture<DashboardComponent>): string | null {
    const root = fixture.nativeElement as HTMLElement;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.metric-card'));
    const processingCard = cards.find((card) => card.textContent?.includes('Procesando'));
    return processingCard?.querySelector('.metric-card__value')?.textContent?.trim() ?? null;
  }

  it('renders a "Procesando" KPI card with the value derived from /admin/metrics (total - completados - fallidos)', () => {
    const fixture = createComponent(
      buildMetrics({ totalAnalysis: 20, completedAnalysis: 12, failedAnalysis: 3 }),
    );

    expect(processingCardValue(fixture)).toBe('5');
  });

  it('never shows a negative "Procesando" value when the backend counters are momentarily inconsistent', () => {
    const fixture = createComponent(
      buildMetrics({ totalAnalysis: 10, completedAnalysis: 8, failedAnalysis: 5 }),
    );

    expect(processingCardValue(fixture)).toBe('0');
  });

  describe('Alertas operativas (Admin PR 1)', () => {
    it('renderiza la sección "Alertas operativas" arriba de las cards existentes', () => {
      const fixture = createComponent(buildMetrics({ failedAnalysisLast30Days: 25 }));
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Alertas operativas');
      expect(el.querySelector('.alert-card')).toBeTruthy();
    });

    it('muestra el estado vacío "No hay alertas..." cuando ninguna condición se cumple', () => {
      const fixture = createComponent(buildMetrics());
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('No hay alertas operativas relevantes en este momento.');
      expect(el.querySelectorAll('.alert-card').length).toBe(0);
    });

    it('no rompe ni muestra undefined/null cuando activeSchedulesWithoutRuns/unreviewedFailedAnalysisOlderThan7Days no vienen del backend', () => {
      const fixture = createComponent(buildMetrics({ failedAnalysisLast30Days: 25 }));
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).not.toContain('undefined');
      expect(el.textContent).not.toContain('null');
    });

    it('Admin PR 3: la alerta "schedules activos sin corridas" linkea a /scheduled-analysis?enabled=true&hasRuns=false', () => {
      const fixture = createComponent(buildMetrics({ activeSchedulesWithoutRuns: 2 }));
      const el = fixture.nativeElement as HTMLElement;

      const link = el.querySelector('.alert-card__action') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/scheduled-analysis?enabled=true&hasRuns=false');
    });

    it('sigue renderizando las cards existentes (Usuarios/Campos/Diagnósticos) junto con las alertas', () => {
      const fixture = createComponent(
        buildMetrics({ totalUsers: 10, totalFields: 78, activeSchedulesWithoutRuns: 2 }),
      );
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('.alert-card')).toBeTruthy();
      expect(el.textContent).toContain('Usuarios');
      expect(el.textContent).toContain('Campos');
      expect(el.textContent).toContain('Diagnósticos');
    });
  });

  describe('Embudo de uso (Admin PR 4)', () => {
    it('el Dashboard incluye la sección de Product Analytics (app-product-analytics)', () => {
      const fixture = createComponent(buildMetrics());
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('app-product-analytics')).toBeTruthy();
    });
  });
});
