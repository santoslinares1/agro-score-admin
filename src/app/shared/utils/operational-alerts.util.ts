import { AdminMetrics } from '../../core/models/metrics.model';
import { OperationalAlert, OperationalAlertSeverity } from '../../core/models/operational-alert.model';

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

// Orden por severidad (critical > warning > opportunity > info). Dentro de la misma severidad se
// conserva el orden en que se agregan más abajo (Array.prototype.sort es estable en motores
// modernos) — así se replica el orden que pidió la auditoría: schedules sin corridas (P0) antes
// que diagnósticos fallidos, aunque ambas alertas sean 'critical'.
const SEVERITY_RANK: Record<OperationalAlertSeverity, number> = {
  critical: 0,
  warning: 1,
  opportunity: 2,
  info: 3,
};

/**
 * Admin PR 1: arma las alertas operativas del Dashboard a partir de /admin/metrics. Preferencia
 * explícita del ticket: "Frontend arma alertas si todas las stats ya están disponibles. API
 * agrega solo stats faltantes, no textos de UI" — por eso el copy vive acá y no en el backend.
 *
 * Cada alerta solo aparece si su condición es > 0 — nunca se muestra un "0 diagnósticos
 * fallidos" a modo de card vacía (ver DashboardComponent, estado "No hay alertas...").
 */
export function buildOperationalAlerts(metrics: AdminMetrics): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  // Alerta 1 (P0 según la auditoría): schedules semanales activos que todavía no registraron
  // ninguna corrida — sin esto no hay evidencia de que el flujo semanal funcione end-to-end.
  // Admin PR 3: enabled=true&hasRuns=false ya filtra de verdad (existencia real de
  // ScheduledAnalysisRun, no lastRunAt — ver AdminService.listScheduledAnalysis) — antes el link
  // iba a la pantalla completa sin filtro, documentado como limitación en PR 1/PR 2.
  const activeSchedulesWithoutRuns = metrics.activeSchedulesWithoutRuns ?? 0;
  if (activeSchedulesWithoutRuns > 0) {
    alerts.push({
      id: 'schedules-without-runs',
      severity: 'critical',
      title: `${activeSchedulesWithoutRuns} ${pluralize(
        activeSchedulesWithoutRuns,
        'monitoreo semanal activo',
        'monitoreos semanales activos',
      )} sin corridas`,
      description: 'El flujo semanal todavía no tiene evidencia de ejecución.',
      count: activeSchedulesWithoutRuns,
      actionLabel: 'Ver programados',
      route: '/scheduled-analysis',
      queryParams: { enabled: true, hasRuns: false },
    });
  }

  // Alerta 2: diagnósticos fallidos en los últimos 30 días — link real con filtro por status.
  const failedAnalysisLast30Days = metrics.failedAnalysisLast30Days ?? 0;
  if (failedAnalysisLast30Days > 0) {
    alerts.push({
      id: 'failed-analysis-30d',
      severity: 'critical',
      title: `${failedAnalysisLast30Days} ${pluralize(
        failedAnalysisLast30Days,
        'diagnóstico fallido',
        'diagnósticos fallidos',
      )} en los últimos 30 días`,
      description: 'Conviene revisar la causa antes de que se acumulen más fallas.',
      count: failedAnalysisLast30Days,
      actionLabel: 'Ver diagnósticos fallidos',
      route: '/analysis',
      queryParams: { status: 'Error' },
    });
  }

  // Alerta 3: diagnósticos fallidos que nadie marcó como revisado hace más de 7 días. Solo los
  // análisis en Error son "revisables" (ver AdminService.markAnalysisReviewed), así que el link
  // combina status=Error + onlyUnreviewed=true — onlyUnreviewed solo no alcanza, porque los
  // análisis Finalizado/Procesando también tienen reviewedAt null estructuralmente.
  const unreviewedFailedAnalysis = metrics.unreviewedFailedAnalysisOlderThan7Days ?? 0;
  if (unreviewedFailedAnalysis > 0) {
    alerts.push({
      id: 'unreviewed-failed-analysis',
      severity: 'warning',
      title: `${unreviewedFailedAnalysis} ${pluralize(
        unreviewedFailedAnalysis,
        'diagnóstico fallido necesita',
        'diagnósticos fallidos necesitan',
      )} revisión hace más de 7 días`,
      description: 'Son diagnósticos con error que nadie marcó como revisado.',
      count: unreviewedFailedAnalysis,
      actionLabel: 'Ver no revisados',
      route: '/analysis',
      queryParams: { status: 'Error', onlyUnreviewed: true },
    });
  }

  // Alerta 4: campos que todavía no tienen ningún diagnóstico — oportunidad de cobertura, no una
  // falla. Link real con filtro hasAnalysis=false (ver AdminService.listFields).
  const fieldsWithNoAnalysis = metrics.fieldsWithNoAnalysis ?? 0;
  if (fieldsWithNoAnalysis > 0) {
    alerts.push({
      id: 'fields-without-analysis',
      severity: 'warning',
      title: `${fieldsWithNoAnalysis} ${pluralize(
        fieldsWithNoAnalysis,
        'campo todavía no tiene',
        'campos todavía no tienen',
      )} ningún diagnóstico`,
      description: 'Oportunidad de activar el primer diagnóstico y sumar cobertura de monitoreo.',
      count: fieldsWithNoAnalysis,
      actionLabel: 'Ver campos sin diagnóstico',
      route: '/fields',
      queryParams: { hasAnalysis: false },
    });
  }

  return [...alerts].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
