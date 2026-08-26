import { AdminMetrics } from '../../core/models/metrics.model';
import { buildOperationalAlerts } from './operational-alerts.util';

function buildMetrics(overrides: Partial<AdminMetrics> = {}): AdminMetrics {
  return {
    totalUsers: 0,
    activeUsers: 0,
    totalFields: 0,
    totalLots: 0,
    totalAnalysis: 0,
    completedAnalysis: 0,
    failedAnalysis: 0,
    averageAnalysisDurationMs: null,
    latestAnalysis: [],
    latestAccessRequests: [],
    ...overrides,
  };
}

describe('buildOperationalAlerts (Admin PR 1)', () => {
  it('no genera ninguna alerta cuando todas las condiciones están en 0/undefined', () => {
    expect(buildOperationalAlerts(buildMetrics())).toEqual([]);
  });

  it('muestra la alerta de diagnósticos fallidos cuando failedAnalysisLast30Days > 0, con link filtrado', () => {
    const alerts = buildOperationalAlerts(buildMetrics({ failedAnalysisLast30Days: 25 }));

    expect(alerts.length).toBe(1);
    expect(alerts[0]).toEqual(
      jasmine.objectContaining({
        id: 'failed-analysis-30d',
        severity: 'critical',
        count: 25,
        route: '/analysis',
        queryParams: { status: 'Error' },
      }),
    );
    expect(alerts[0].title).toContain('25');
  });

  it('oculta la alerta de diagnósticos fallidos cuando failedAnalysisLast30Days = 0', () => {
    const alerts = buildOperationalAlerts(buildMetrics({ failedAnalysisLast30Days: 0 }));
    expect(alerts.find((a) => a.id === 'failed-analysis-30d')).toBeUndefined();
  });

  it('muestra la alerta de campos sin diagnóstico cuando fieldsWithNoAnalysis > 0, con hasAnalysis=false', () => {
    const alerts = buildOperationalAlerts(buildMetrics({ fieldsWithNoAnalysis: 59 }));

    expect(alerts.length).toBe(1);
    expect(alerts[0]).toEqual(
      jasmine.objectContaining({
        id: 'fields-without-analysis',
        severity: 'warning',
        count: 59,
        route: '/fields',
        queryParams: { hasAnalysis: false },
      }),
    );
  });

  it('muestra la alerta de schedules activos sin corridas cuando activeSchedulesWithoutRuns > 0', () => {
    const alerts = buildOperationalAlerts(buildMetrics({ activeSchedulesWithoutRuns: 2 }));

    expect(alerts.length).toBe(1);
    expect(alerts[0]).toEqual(
      jasmine.objectContaining({
        id: 'schedules-without-runs',
        severity: 'critical',
        count: 2,
        route: '/scheduled-analysis',
      }),
    );
    expect(alerts[0].queryParams).toBeUndefined();
  });

  it('muestra la alerta de no revisados hace más de 7 días combinando status=Error + onlyUnreviewed=true', () => {
    const alerts = buildOperationalAlerts(
      buildMetrics({ unreviewedFailedAnalysisOlderThan7Days: 4 }),
    );

    expect(alerts.length).toBe(1);
    expect(alerts[0]).toEqual(
      jasmine.objectContaining({
        id: 'unreviewed-failed-analysis',
        severity: 'warning',
        count: 4,
        route: '/analysis',
        queryParams: { status: 'Error', onlyUnreviewed: true },
      }),
    );
  });

  it('ordena por severidad: schedules sin corridas y fallidos (critical) antes que no revisados y campos (warning)', () => {
    const alerts = buildOperationalAlerts(
      buildMetrics({
        activeSchedulesWithoutRuns: 2,
        failedAnalysisLast30Days: 25,
        unreviewedFailedAnalysisOlderThan7Days: 4,
        fieldsWithNoAnalysis: 59,
      }),
    );

    expect(alerts.map((a) => a.id)).toEqual([
      'schedules-without-runs',
      'failed-analysis-30d',
      'unreviewed-failed-analysis',
      'fields-without-analysis',
    ]);
  });

  it('usa singular cuando el conteo es 1, sin "1 diagnósticos"', () => {
    const alerts = buildOperationalAlerts(buildMetrics({ failedAnalysisLast30Days: 1 }));
    expect(alerts[0].title).toBe('1 diagnóstico fallido en los últimos 30 días');
  });

  it('cada alerta tiene actionLabel y route no vacíos', () => {
    const alerts = buildOperationalAlerts(
      buildMetrics({
        activeSchedulesWithoutRuns: 1,
        failedAnalysisLast30Days: 1,
        unreviewedFailedAnalysisOlderThan7Days: 1,
        fieldsWithNoAnalysis: 1,
      }),
    );

    for (const alert of alerts) {
      expect(alert.actionLabel.length).toBeGreaterThan(0);
      expect(alert.route.length).toBeGreaterThan(0);
    }
  });
});
