import { AnalysisStatus, AnalysisTechnicalVerdict } from './analysis.model';

// PR 13B: mismos valores que field-analysis-schedule.entity.ts / scheduled-analysis-run.entity.ts
// en agro-score-api.
export type ScheduleFrequency = 'weekly';
export type ScheduleLastStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ScheduledRunStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'email_sent';

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
}
