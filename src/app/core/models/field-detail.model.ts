import { AnalysisStatus, AnalysisTechnicalVerdict } from './analysis.model';
import { FieldAnalysisStatus, FieldLatestAnalysis } from './field.model';
import {
  AdminScheduledAnalysisRun,
  AdminWeeklyTechnicalVerdict,
  ScheduleFrequency,
} from './scheduled-analysis.model';

// Admin PR 6: mismo shape que AdminFieldDetail en agro-score-api/src/admin/dto/
// admin-field-detail.dto.ts — GET /admin/fields/:fieldId, solo lectura.

export interface FieldDetailAnalysisRow {
  id: string;
  status: AnalysisStatus;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  // Mismo criterio que FieldLatestAnalysis.score (PR5): solo cuando status='Finalizado'.
  score: number | null;
  errorMessage: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
}

export interface FieldDetailLot {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldDetailWeeklyMonitoring {
  active: boolean;
  scheduleId: string | null;
  frequency: ScheduleFrequency | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  hasRuns: boolean;
}

/**
 * Admin PR 6: cada corrida trae su weeklyTechnicalVerdict anidado (si existe) — mismo patrón que
 * AdminScheduledAnalysisItem.weeklyTechnicalVerdict (PR16D) para la corrida más reciente de un
 * schedule, extendido acá a las N corridas del historial.
 */
export type FieldDetailScheduledRun = AdminScheduledAnalysisRun & {
  weeklyTechnicalVerdict: AdminWeeklyTechnicalVerdict | null;
};

export interface AdminFieldDetail {
  field: {
    id: string;
    name: string;
    ownerId: string;
    ownerEmail: string | null;
    ownerFullName: string | null;
    lotsCount: number;
    createdAt: string;
    updatedAt: string;
    analysisStatus: FieldAnalysisStatus;
    requiresAttention: boolean;
  };
  latestAnalysis: FieldLatestAnalysis | null;
  technicalVerdict: AnalysisTechnicalVerdict | null;
  lots: FieldDetailLot[];
  // Últimas N (ver docs/admin-ux-notes.md — Admin PR 6), orden DESC.
  analyses: FieldDetailAnalysisRow[];
  weeklyMonitoring: FieldDetailWeeklyMonitoring;
  // Últimas N del schedule del campo, orden DESC.
  scheduledRuns: FieldDetailScheduledRun[];
}
