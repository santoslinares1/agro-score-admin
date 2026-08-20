import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AdminMetrics } from '../../core/models/metrics.model';
import { MetricsService } from '../../core/services/metrics.service';
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

describe('DashboardComponent', () => {
  function createComponent(metrics: AdminMetrics): ComponentFixture<DashboardComponent> {
    const metricsServiceSpy: jasmine.SpyObj<MetricsService> = jasmine.createSpyObj('MetricsService', [
      'getMetrics',
    ]);
    metricsServiceSpy.getMetrics.and.returnValue(of(metrics));

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), { provide: MetricsService, useValue: metricsServiceSpy }],
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
});
