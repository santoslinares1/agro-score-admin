// Los valores de status se mantienen en español, igual que el backend
// (agro-score-api mantuvo el sistema de estados existente sin migrarlo a
// inglés — ver docs/admin-backend.md en agro-score-api).
export type AnalysisStatus = 'Procesando' | 'Finalizado' | 'Error';

// PR 13A: mismos valores que analysis-verdict/entities/analysis-technical-verdict.entity.ts en
// agro-score-api (AnalysisVerdictStatus/AnalysisVerdictLabel/AnalysisVerdictConfidence).
export type AnalysisTechnicalVerdictStatus = 'pending' | 'generated' | 'failed';
export type AnalysisVerdictLabel = 'favorable' | 'attention' | 'critical' | 'insufficient_data';
export type AnalysisVerdictConfidence = 'low' | 'medium' | 'high';

/**
 * PR 13A: shape real de GET /admin/analysis (AdminAnalysisTechnicalVerdict en
 * agro-score-api/src/admin/dto) — a diferencia del contrato público de agro-score-web
 * (AnalysisTechnicalVerdictResponse), acá SÍ viaja errorMessage: el endpoint admin está detrás de
 * JwtAuthGuard + RolesGuard(owner|admin), pensado para soporte/debugging, no para el usuario
 * final. verdict/confidence/summary pueden ser null solo en teoría (AnalysisVerdictService
 * siempre persiste contenido "seguro" incluso para status='failed', ver FAILED_VERDICT_CONTENT en
 * agro-score-api) — se tipan nullable igual para no asumir de más sobre datos históricos.
 */
export interface AnalysisTechnicalVerdict {
  status: AnalysisTechnicalVerdictStatus;
  verdict: AnalysisVerdictLabel | null;
  confidence: AnalysisVerdictConfidence | null;
  summary: string | null;
  keyFindings: string[];
  possibleCauses: string[];
  recommendations: string[];
  limitations: string[];
  generatedAt: string | null;
  generator: string | null;
  promptVersion: string | null;
  errorMessage: string | null;
}

export interface AdminAnalysis {
  id: string;
  fieldId: string | null;
  fieldName: string | null;
  ownerId: string | null;
  ownerEmail: string | null;
  ownerFullName: string | null;
  status: AnalysisStatus;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  // ADMIN-2: operación sobre diagnósticos fallidos.
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  retryCount: number;
  lastRetriedAt: string | null;
  createdAt: string;
  // PR 13A: opcional — undefined para cualquier endpoint que todavía no lo traiga, null cuando el
  // backend confirma que no existe fila en analysis_technical_verdicts para este análisis.
  technicalVerdict?: AnalysisTechnicalVerdict | null;
}
