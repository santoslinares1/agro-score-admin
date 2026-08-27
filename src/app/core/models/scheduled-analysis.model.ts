import {
  AnalysisStatus,
  AnalysisTechnicalVerdict,
  AnalysisTechnicalVerdictStatus,
  AnalysisVerdictConfidence,
  AnalysisVerdictLabel,
} from './analysis.model';

// PR 13B: mismos valores que field-analysis-schedule.entity.ts / scheduled-analysis-run.entity.ts
// en agro-score-api.
export type ScheduleFrequency = 'weekly';
export type ScheduleLastStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ScheduledRunStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'email_sent';

// PR 16D: sin equivalente en el veredicto individual (que no tiene eje temporal) — mismos valores
// que weekly-technical-verdict/entities/weekly-technical-verdict.entity.ts en agro-score-api.
export type WeeklyVerdictTrend =
  | 'improving'
  | 'stable'
  | 'worsening'
  | 'mixed'
  | 'insufficient_data';

/**
 * PR 16D: shape real de weeklyTechnicalVerdict dentro de GET /admin/scheduled-analysis
 * (WeeklyTechnicalVerdictResponse en agro-score-api/src/weekly-technical-verdict/dto) — reusa
 * verdict/confidence/status de AnalysisTechnicalVerdict (mismos enums, ver analysis.model.ts) en
 * vez de redeclararlos: a diferencia del backend (que sí duplica esos tipos entre
 * analysis-verdict/ y weekly-technical-verdict/ para no acoplar esos dos módulos), en el frontend
 * ScheduledAnalysisModel ya reusa AnalysisTechnicalVerdict tal cual para `technicalVerdict` más
 * abajo, así que seguir esa misma convención acá es más consistente que introducir una nueva.
 * errorMessage SÍ viaja (admin, igual que el veredicto individual).
 */
export interface AdminWeeklyTechnicalVerdict {
  status: AnalysisTechnicalVerdictStatus;
  verdict: AnalysisVerdictLabel | null;
  trend: WeeklyVerdictTrend | null;
  confidence: AnalysisVerdictConfidence | null;
  summary: string | null;
  keyChanges: string[];
  areasToReview: string[];
  recommendations: string[];
  limitations: string[];
  previousSnapshotId: string | null;
  generatedAt: string | null;
  generator: string | null;
  promptVersion: string | null;
  errorMessage: string | null;
}

export interface AdminScheduledAnalysisRun {
  id: string;
  status: ScheduledRunStatus;
  scheduledFor: string;
  analysisId: string | null;
  analysisStatus: AnalysisStatus | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  emailSentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * PR 13B: shape real de GET /admin/scheduled-analysis. latestRun es la corrida más reciente de
 * ese schedule, no un historial. technicalVerdict reusa el mismo AnalysisTechnicalVerdict de
 * PR 13A (admin ya puede ver generator/promptVersion/errorMessage ahí) — es el veredicto del
 * Analysis de latestRun, no uno propio del schedule.
 */
export interface AdminScheduledAnalysisItem {
  id: string;
  fieldId: string;
  fieldName: string | null;
  userId: string;
  userEmail: string | null;
  userFullName: string | null;
  enabled: boolean;
  frequency: ScheduleFrequency;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: ScheduleLastStatus | null;
  lastErrorMessage: string | null;
  latestRun: AdminScheduledAnalysisRun | null;
  technicalVerdict: AnalysisTechnicalVerdict | null;
  /**
   * PR 16D: diagnóstico semanal comparativo (evolución vs. el reporte anterior) — distinto de
   * technicalVerdict (estado del análisis puntual de latestRun). Ver PR 16A/16B.
   */
  weeklyTechnicalVerdict: AdminWeeklyTechnicalVerdict | null;
}

/**
 * Admin PR 3: resumen agregado de TODOS los schedules — no acotado a la página/filtros actuales
 * (ver AdminService.getScheduledAnalysisSummary en agro-score-api, mismo comentario ahí con el
 * detalle de cada número). Viaja junto a la respuesta paginada de siempre.
 */
export interface AdminScheduledAnalysisSummary {
  total: number;
  active: number;
  inactive: number;
  withoutRuns: number;
  lastRunOk: number;
  lastRunFailed: number;
  mailSentLast7Days: number;
  mailSentLast30Days: number;
  mailPendingOrFailed: number;
}
