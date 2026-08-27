import { AnalysisStatus, AnalysisTechnicalVerdict } from './analysis.model';
import { FieldAnalysisStatus, FieldLatestAnalysis, FieldWeeklyMonitoring } from './field.model';
import {
  AdminScheduledAnalysisRun,
  AdminWeeklyTechnicalVerdict,
  ScheduleFrequency,
} from './scheduled-analysis.model';
import { AdminUser } from './user.model';

// Admin PR 7: mismo shape que AdminUserDetail en agro-score-api/src/admin/dto/
// admin-user-detail.dto.ts — GET /admin/users/:userId, solo lectura.

export interface UserDetailField {
  id: string;
  name: string;
  lotsCount: number;
  createdAt: string;
  updatedAt: string;
  analysisStatus: FieldAnalysisStatus;
  requiresAttention: boolean;
  latestAnalysis: FieldLatestAnalysis | null;
  technicalVerdict: AnalysisTechnicalVerdict | null;
  weeklyMonitoring: FieldWeeklyMonitoring;
}

export interface UserDetailAnalysisRow {
  id: string;
  fieldId: string | null;
  fieldName: string | null;
  status: AnalysisStatus;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  // Mismo criterio que FieldLatestAnalysis.score (PR5): solo cuando status='Finalizado'.
  score: number | null;
  errorMessage: string | null;
  reviewedAt: string | null;
}

export interface UserDetailScheduledItem {
  scheduleId: string;
  fieldId: string;
  fieldName: string | null;
  enabled: boolean;
  frequency: ScheduleFrequency;
  nextRunAt: string | null;
  lastRunAt: string | null;
  // Existencia REAL de corridas (mismo criterio que hasRuns, PR3) — no lastRunAt.
  hasRuns: boolean;
  latestRun: AdminScheduledAnalysisRun | null;
  technicalVerdict: AnalysisTechnicalVerdict | null;
  weeklyTechnicalVerdict: AdminWeeklyTechnicalVerdict | null;
}

/**
 * Admin PR 7: única correlación de auditoría honesta hoy — eventos con targetType='user' y
 * targetId=<userId> (alta/edición/desactivación/cambio de rol/reset de contraseña). Eventos de
 * invitación o solicitud de acceso quedan afuera: su targetId apunta a esa entidad, no al usuario.
 */
export interface UserDetailAuditLog {
  id: string;
  action: string;
  actorUserId: string | null;
  actorEmail: string | null;
  targetType: string;
  targetId: string | null;
  createdAt: string;
}

export interface UserDetailSummary {
  fieldsCount: number;
  lotsCount: number;
  analysesCount: number;
  completedAnalysesCount: number;
  failedAnalysesCount: number;
  fieldsWithoutAnalysisCount: number;
  fieldsRequiringAttentionCount: number;
  activeSchedulesCount: number;
  schedulesWithoutRunsCount: number;
  sentEmailsCount: number;
}

export interface AdminUserDetail {
  user: AdminUser;
  // Cubre TODOS los campos/schedules/análisis del usuario, no solo los que viajan en los arrays
  // de abajo (esos sí están acotados — ver docs/admin-ux-notes.md, Admin PR 7).
  summary: UserDetailSummary;
  fields: UserDetailField[];
  recentAnalyses: UserDetailAnalysisRow[];
  scheduledAnalysis: UserDetailScheduledItem[];
  recentAuditLogs: UserDetailAuditLog[];
}
