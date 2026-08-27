import { AnalysisStatus, AnalysisTechnicalVerdict } from './analysis.model';

// Admin PR 5: mismos valores que AdminFieldAnalysisStatus en
// agro-score-api/src/admin/dto/admin-field.dto.ts — estado administrativo/producto derivado de
// Analysis.status + AnalysisTechnicalVerdict.verdict, nunca un diagnóstico agronómico nuevo.
export type FieldAnalysisStatus =
  | 'without_analysis'
  | 'processing'
  | 'completed'
  | 'error'
  | 'attention';

export interface FieldLatestAnalysis {
  id: string;
  status: AnalysisStatus;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  // Solo viaja cuando el análisis está Finalizado — ver comentario en admin-field.dto.ts (API).
  score: number | null;
}

export interface FieldWeeklyMonitoring {
  active: boolean;
  scheduleId: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  // Existencia REAL de corridas (mismo criterio que hasRuns, PR3) — no lastRunAt.
  hasRuns: boolean;
}

export interface AdminField {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerFullName: string | null;
  lotsCount: number;
  createdAt: string;
  updatedAt: string;

  // Admin PR 5: estado real de uso/producto — ver shared/utils/field-status.util.ts para
  // labels/tonos, y AdminService.deriveFieldAnalysisStatus (agro-score-api) para la definición
  // exacta de cada transición. Opcionales por el mismo motivo que el resto de campos agregados en
  // PRs anteriores: compatibilidad si el backend que responde es más viejo que este frontend.
  analysisStatus?: FieldAnalysisStatus;
  requiresAttention?: boolean;
  latestAnalysis?: FieldLatestAnalysis | null;
  technicalVerdict?: AnalysisTechnicalVerdict | null;
  weeklyMonitoring?: FieldWeeklyMonitoring;
}
